from __future__ import annotations

import re
import time
import unicodedata
from typing import Any
from urllib.parse import urlparse

import requests

API_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.nationalPhoneNumber",
        "places.formattedAddress",
        "places.googleMapsUri",
        "places.rating",
        "places.userRatingCount",
        "places.websiteUri",
        "places.businessStatus",
        "nextPageToken",
    ]
)

SEGMENTOS_BONUS = {
    "dentista",
    "clinica estetica",
    "moveis planejados",
    "escritorio de arquitetura",
    "pequena industria",
    "imobiliaria",
}

PRESENCA_SEM_SITE = "Sem site"
PRESENCA_SO_REDE_SOCIAL = "Só rede social"
PRESENCA_SITE_PROPRIO = "Site próprio"

# Domínios que o Google aceita no campo "site" mas que não são um site próprio da empresa.
DOMINIOS_NAO_SITE = (
    "instagram.com",
    "facebook.com",
    "fb.com",
    "fb.me",
    "linktr.ee",
    "linktree.com",
    "beacons.ai",
    "bio.link",
    "wa.me",
    "whatsapp.com",
    "tiktok.com",
    "youtube.com",
    "youtu.be",
    "linkedin.com",
    "twitter.com",
    "x.com",
    "ifood.com.br",
    "olx.com.br",
    "mercadolivre.com.br",
    "g.page",
    "goo.gl",
    "business.site",
)

WHATSAPP_PROVAVEL = "Provável WhatsApp"
WHATSAPP_CONFIRMADO = "WhatsApp confirmado"
WHATSAPP_INVALIDO = "Inválido"
WHATSAPP_FIXO = "Telefone fixo"
WHATSAPP_VERIFICAR = "Verificar"
WHATSAPP_SEM_TELEFONE = "Sem telefone"
WHATSAPP_ALCANCAVEL = {WHATSAPP_PROVAVEL, WHATSAPP_CONFIRMADO}
# Status que o time define no contato manual e que uma nova busca não pode sobrescrever.
WHATSAPP_STATUS_PRESERVADOS = (WHATSAPP_CONFIRMADO, WHATSAPP_INVALIDO)

STATUS_COMERCIAIS_QUE_CONFIRMAM_WHATSAPP = {
    "Respondeu",
    "Diagnóstico enviado",
    "Reunião marcada",
    "Proposta",
    "Fechado",
}

SCORE_CONFIG_PADRAO: dict[str, Any] = {
    "peso_sem_site": 3,
    "peso_so_rede_social": 2,
    "peso_nota_google": 2,
    "nota_minima": 4.0,
    "peso_avaliacoes": 2,
    "minimo_avaliacoes": 20,
    "peso_telefone": 1,
    "peso_whatsapp_provavel": 1,
    "peso_prioridade_alta": 1,
    "peso_segmento_prioritario": 1,
    "segmentos_prioritarios": sorted(SEGMENTOS_BONUS),
    "peso_cidade_prioritaria": 1,
    "cidades_prioritarias": [],
    "penalidade_fechado_temporariamente": 2,
    "limite_quente": 8,
    "limite_morno": 5,
}

_SCORE_INTEIROS = {
    "peso_sem_site": (-10, 10),
    "peso_so_rede_social": (-10, 10),
    "peso_nota_google": (-10, 10),
    "peso_avaliacoes": (-10, 10),
    "minimo_avaliacoes": (0, 100000),
    "peso_telefone": (-10, 10),
    "peso_whatsapp_provavel": (-10, 10),
    "peso_prioridade_alta": (-10, 10),
    "peso_segmento_prioritario": (-10, 10),
    "peso_cidade_prioritaria": (-10, 10),
    "penalidade_fechado_temporariamente": (0, 10),
    "limite_quente": (0, 100),
    "limite_morno": (0, 100),
}
_SCORE_LISTAS = ("segmentos_prioritarios", "cidades_prioritarias")


def resolver_score_config(bruto: Any) -> dict[str, Any]:
    """Mescla a configuração salva da campanha com o padrão, ignorando valores inválidos."""
    config: dict[str, Any] = {
        chave: list(valor) if isinstance(valor, list) else valor
        for chave, valor in SCORE_CONFIG_PADRAO.items()
    }
    if not isinstance(bruto, dict):
        return config

    for chave, (minimo, maximo) in _SCORE_INTEIROS.items():
        valor = bruto.get(chave)
        if isinstance(valor, bool) or valor is None:
            continue
        try:
            numero = int(round(float(valor)))
        except (TypeError, ValueError):
            continue
        config[chave] = max(minimo, min(maximo, numero))

    nota = bruto.get("nota_minima")
    if nota is not None and not isinstance(nota, bool):
        try:
            config["nota_minima"] = max(0.0, min(5.0, float(nota)))
        except (TypeError, ValueError):
            pass

    for chave in _SCORE_LISTAS:
        valor = bruto.get(chave)
        if isinstance(valor, list):
            itens = [str(item).strip() for item in valor if str(item).strip()]
            config[chave] = list(dict.fromkeys(itens))[:50]

    return config


def normalizar_texto(valor: Any) -> str:
    texto = "" if valor is None else str(valor).strip()
    texto = "".join(
        caractere
        for caractere in unicodedata.normalize("NFKD", texto)
        if not unicodedata.combining(caractere)
    )
    return " ".join(texto.casefold().split())


def mensagem_erro_api(resposta: requests.Response) -> str:
    try:
        detalhe = resposta.json().get("error", {}).get("message", resposta.text)
    except ValueError:
        detalhe = resposta.text
    explicacoes = {
        400: "requisição inválida",
        401: "chave ou autenticação inválida",
        403: "API desativada, faturamento ausente ou restrição incorreta na chave",
        429: "limite/cota da API atingido",
    }
    simples = explicacoes.get(resposta.status_code, "erro retornado pela API")
    return f"HTTP {resposta.status_code} ({simples}): {detalhe}"


def buscar_lugares(api_key: str, consulta: str, limite: int) -> list[dict[str, Any]]:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    lugares: list[dict[str, Any]] = []
    token: str | None = None

    with requests.Session() as sessao:
        while len(lugares) < limite:
            corpo: dict[str, Any] = {
                "textQuery": consulta,
                "languageCode": "pt-BR",
                "regionCode": "BR",
                "pageSize": min(20, limite - len(lugares)),
            }
            if token:
                corpo["pageToken"] = token
            try:
                resposta = sessao.post(API_URL, headers=headers, json=corpo, timeout=25)
            except requests.RequestException as erro:
                raise RuntimeError(f"falha de conexão com a Google Places API: {erro}") from erro
            if not resposta.ok:
                raise RuntimeError(mensagem_erro_api(resposta))
            dados = resposta.json()
            lugares.extend(dados.get("places", []))
            token = dados.get("nextPageToken")
            if not token:
                break
            time.sleep(1)

    return lugares[:limite]


def limpar_telefone(valor: Any) -> str:
    digitos = re.sub(r"\D", "", "" if valor is None else str(valor))
    if digitos.startswith("00"):
        digitos = digitos[2:]
    if not digitos:
        return ""
    if digitos.startswith("55") and len(digitos) in {12, 13}:
        return digitos
    return f"55{digitos}"


def analisar_whatsapp(telefone_limpo: str | None) -> str:
    if not telefone_limpo:
        return WHATSAPP_SEM_TELEFONE
    nacional = telefone_limpo[2:] if telefone_limpo.startswith("55") else telefone_limpo
    if len(nacional) < 8:
        return WHATSAPP_SEM_TELEFONE
    if len(nacional) not in {10, 11} or not re.match(r"^[1-9][1-9]", nacional):
        return WHATSAPP_VERIFICAR
    if len(nacional) == 11 and nacional[2] == "9":
        return WHATSAPP_PROVAVEL
    if len(nacional) == 10 and nacional[2] in "2345":
        return WHATSAPP_FIXO
    return WHATSAPP_VERIFICAR


def whatsapp_apos_status_contato(
    novo_status: str, telefone_limpo: str | None, atual: str | None
) -> str | None:
    """Status de WhatsApp que o lead deve ter depois de uma mudança de status comercial.

    Retorna None quando nada precisa mudar.
    """
    if novo_status == "Contato inválido":
        return WHATSAPP_INVALIDO if atual != WHATSAPP_INVALIDO else None
    if novo_status in STATUS_COMERCIAIS_QUE_CONFIRMAM_WHATSAPP:
        return WHATSAPP_CONFIRMADO if atual != WHATSAPP_CONFIRMADO else None
    if atual == WHATSAPP_INVALIDO:
        # Quem tinha marcado inválido por engano e voltou o status: recalcula pelo número.
        recalculado = analisar_whatsapp(telefone_limpo)
        return recalculado if recalculado != atual else None
    return None


def _host_do_site(site: str) -> str:
    texto = site.strip()
    if "://" not in texto:
        texto = f"//{texto}"
    try:
        host = (urlparse(texto).hostname or "").lower()
    except ValueError:
        return ""
    return host[4:] if host.startswith("www.") else host


def classificar_presenca_web(site: str | None) -> str:
    texto = (site or "").strip()
    if not texto:
        return PRESENCA_SEM_SITE
    host = _host_do_site(texto)
    if any(host == dominio or host.endswith(f".{dominio}") for dominio in DOMINIOS_NAO_SITE):
        return PRESENCA_SO_REDE_SOCIAL
    return PRESENCA_SITE_PROPRIO


def sem_site_por_presenca(presenca_web: str) -> str:
    return "NÃO" if presenca_web == PRESENCA_SITE_PROPRIO else "SIM"


def regex_sql_dominios_nao_site() -> str:
    dominios = "|".join(re.escape(dominio) for dominio in DOMINIOS_NAO_SITE)
    return rf"^(https?://)?([^/?#:@]+\.)?({dominios})(:[0-9]+)?([/?#]|$)"


def pontuar(
    *,
    presenca_web: str,
    avaliacao: float,
    quantidade_avaliacoes: int,
    telefone: str | None,
    whatsapp_status: str | None,
    prioridade: str | None,
    segmento: str | None,
    cidade: str | None = None,
    business_status: str | None = None,
    config: dict[str, Any] | None = None,
) -> tuple[int, str]:
    cfg = resolver_score_config(config)
    segmentos_prioritarios = {normalizar_texto(item) for item in cfg["segmentos_prioritarios"]}
    cidades_prioritarias = {normalizar_texto(item) for item in cfg["cidades_prioritarias"]}

    score = 0
    if presenca_web == PRESENCA_SEM_SITE:
        score += cfg["peso_sem_site"]
    elif presenca_web == PRESENCA_SO_REDE_SOCIAL:
        score += cfg["peso_so_rede_social"]
    if avaliacao >= cfg["nota_minima"]:
        score += cfg["peso_nota_google"]
    if quantidade_avaliacoes >= cfg["minimo_avaliacoes"]:
        score += cfg["peso_avaliacoes"]
    if telefone and whatsapp_status != WHATSAPP_INVALIDO:
        score += cfg["peso_telefone"]
    if whatsapp_status in WHATSAPP_ALCANCAVEL:
        score += cfg["peso_whatsapp_provavel"]
    if normalizar_texto(prioridade) == "alta":
        score += cfg["peso_prioridade_alta"]
    if normalizar_texto(segmento) in segmentos_prioritarios:
        score += cfg["peso_segmento_prioritario"]
    if normalizar_texto(cidade) in cidades_prioritarias:
        score += cfg["peso_cidade_prioritaria"]
    if business_status == "CLOSED_TEMPORARILY":
        score -= cfg["penalidade_fechado_temporariamente"]
    score = max(score, 0)

    if score >= cfg["limite_quente"]:
        classificacao = "Quente"
    elif score >= cfg["limite_morno"]:
        classificacao = "Morno"
    else:
        classificacao = "Frio"
    return score, classificacao


def montar_lead(
    lugar: dict[str, Any],
    *,
    cidade: str,
    segmento: str,
    prioridade: str,
    regiao: str | None = None,
    score_config: dict[str, Any] | None = None,
) -> dict[str, Any]:
    site = str(lugar.get("websiteUri", "")).strip()
    presenca_web = classificar_presenca_web(site)
    avaliacao = float(lugar.get("rating") or 0)
    quantidade = int(lugar.get("userRatingCount") or 0)
    telefone = str(lugar.get("nationalPhoneNumber", "")).strip()
    telefone_limpo = limpar_telefone(telefone)
    whatsapp_status = analisar_whatsapp(telefone_limpo)
    business_status = lugar.get("businessStatus", "")
    score, classificacao = pontuar(
        presenca_web=presenca_web,
        avaliacao=avaliacao,
        quantidade_avaliacoes=quantidade,
        telefone=telefone,
        whatsapp_status=whatsapp_status,
        prioridade=prioridade,
        segmento=segmento,
        cidade=cidade,
        business_status=business_status,
        config=score_config,
    )

    return {
        "place_id": lugar.get("id", ""),
        "nome": lugar.get("displayName", {}).get("text", "") or "",
        "telefone": telefone,
        "telefone_limpo": telefone_limpo,
        "whatsapp_status": whatsapp_status,
        "endereco": lugar.get("formattedAddress", ""),
        "cidade": cidade,
        "segmento": segmento,
        "regiao": regiao,
        "google_maps_url": lugar.get("googleMapsUri", ""),
        "avaliacao": avaliacao or None,
        "quantidade_avaliacoes": quantidade or None,
        "site_cadastrado": site,
        "sem_site_cadastrado": sem_site_por_presenca(presenca_web),
        "tipo_presenca_web": presenca_web,
        "business_status": business_status,
        "score_oportunidade": score,
        "classificacao_lead": classificacao,
        "prioridade": prioridade,
    }
