from __future__ import annotations

import re
import time
import unicodedata
from typing import Any

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


def analisar_whatsapp(telefone_limpo: str) -> str:
    if not telefone_limpo:
        return "Sem telefone"
    nacional = telefone_limpo[2:] if telefone_limpo.startswith("55") else telefone_limpo
    valido_com_ddd = len(nacional) in {10, 11} and nacional[:2].isdigit() and nacional[:2] != "00"
    if valido_com_ddd and len(nacional) == 11 and nacional[2] == "9":
        return "Provável WhatsApp"
    if valido_com_ddd:
        return "Verificar"
    return "Sem telefone" if len(nacional) < 8 else "Verificar"


def pontuar(
    *, site: str, avaliacao: float, quantidade_avaliacoes: int, telefone: str, prioridade: str, segmento: str
) -> tuple[int, str]:
    prioridade_alta = normalizar_texto(prioridade) == "alta"
    segmento_bonus = normalizar_texto(segmento) in SEGMENTOS_BONUS

    score = 0
    if not site:
        score += 3
    if avaliacao >= 4:
        score += 2
    if quantidade_avaliacoes >= 20:
        score += 2
    if telefone:
        score += 1
    if prioridade_alta:
        score += 1
    if segmento_bonus:
        score += 1

    classificacao = "Quente" if score >= 8 else "Morno" if score >= 5 else "Frio"
    return score, classificacao


def montar_lead(
    lugar: dict[str, Any], *, cidade: str, segmento: str, prioridade: str
) -> dict[str, Any]:
    site = str(lugar.get("websiteUri", "")).strip()
    avaliacao = float(lugar.get("rating") or 0)
    quantidade = int(lugar.get("userRatingCount") or 0)
    telefone = str(lugar.get("nationalPhoneNumber", "")).strip()
    telefone_limpo = limpar_telefone(telefone)
    score, classificacao = pontuar(
        site=site,
        avaliacao=avaliacao,
        quantidade_avaliacoes=quantidade,
        telefone=telefone,
        prioridade=prioridade,
        segmento=segmento,
    )

    return {
        "place_id": lugar.get("id", ""),
        "nome": lugar.get("displayName", {}).get("text", "") or "",
        "telefone": telefone,
        "telefone_limpo": telefone_limpo,
        "whatsapp_status": analisar_whatsapp(telefone_limpo),
        "endereco": lugar.get("formattedAddress", ""),
        "cidade": cidade,
        "segmento": segmento,
        "google_maps_url": lugar.get("googleMapsUri", ""),
        "avaliacao": avaliacao or None,
        "quantidade_avaliacoes": quantidade or None,
        "site_cadastrado": site,
        "sem_site_cadastrado": "SIM" if not site else "NÃO",
        "business_status": lugar.get("businessStatus", ""),
        "score_oportunidade": score,
        "classificacao_lead": classificacao,
        "prioridade": prioridade,
    }
