from __future__ import annotations

import hashlib
import re
import unicodedata
from io import BytesIO
from typing import Any

from openpyxl import load_workbook


def _normalizar_coluna(value: Any) -> str:
    texto = str(value or "").strip().lower()
    texto = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode("ascii")
    texto = re.sub(r"[^a-z0-9]+", "_", texto).strip("_")
    return texto


COLUNAS: dict[str, str] = {
    "empresa": "nome",
    "nome": "nome",
    "nome_da_empresa": "nome",
    "telefone": "telefone",
    "telefone_limpo": "telefone_limpo",
    "whatsapp_status": "whatsapp_status",
    "endereco": "endereco",
    "google_maps": "google_maps_url",
    "google_maps_url": "google_maps_url",
    "link_google_maps": "google_maps_url",
    "avaliacao": "avaliacao",
    "quantidade_avaliacoes": "quantidade_avaliacoes",
    "qtd_avaliacoes": "quantidade_avaliacoes",
    "site": "site_cadastrado",
    "site_cadastrado": "site_cadastrado",
    "websiteuri": "site_cadastrado",
    "website_uri": "site_cadastrado",
    "sem_site": "sem_site_cadastrado",
    "sem_site_cadastrado": "sem_site_cadastrado",
    "score": "score_oportunidade",
    "score_oportunidade": "score_oportunidade",
    "classificacao": "classificacao_lead",
    "classificacao_lead": "classificacao_lead",
    "prioridade": "prioridade",
    "regiao": "regiao",
    "cidade": "cidade",
    "segmento": "segmento",
    "oferta_principal": "oferta_principal",
    "observacao_comercial": "observacao_comercial",
    "status_contato": "status_contato",
    "proximo_followup": "proximo_followup",
    "respondeu": "respondeu",
    "interesse": "interesse",
    "diagnostico_enviado": "diagnostico_enviado",
    "reuniao_marcada": "reuniao_marcada",
    "proposta_enviada": "proposta_enviada",
    "fechado": "fechado",
    "motivo_perda": "motivo_perda",
    "observacao_humana": "observacao_humana",
    "place_id": "place_id",
    "business_status": "business_status",
}


def _texto(value: Any) -> str | None:
    if value is None:
        return None
    texto = str(value).strip()
    return texto or None


def _inteiro(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).replace(",", ".")))
    except ValueError:
        return None


def _decimal(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        return None


def _booleano(value: Any) -> bool | None:
    if value is None or value == "":
        return None
    texto = str(value).strip().lower()
    if texto in {"sim", "s", "yes", "true", "1"}:
        return True
    if texto in {"nao", "não", "n", "no", "false", "0"}:
        return False
    return None


def _somente_numeros(value: str | None) -> str:
    return re.sub(r"\D", "", value or "")


def _telefone_limpo(telefone: str | None, telefone_limpo: str | None) -> str | None:
    numero = _somente_numeros(telefone_limpo or telefone)
    if not numero:
        return None
    if numero.startswith("55"):
        return numero
    if 10 <= len(numero) <= 11:
        return f"55{numero}"
    return numero


def _whatsapp_status(telefone_limpo: str | None, informado: str | None) -> str:
    if informado:
        return informado
    if not telefone_limpo:
        return "Sem telefone"
    if re.match(r"^55[1-9][0-9]9[0-9]{8}$", telefone_limpo):
        return "Provável WhatsApp"
    return "Verificar"


def _place_id(row: dict[str, Any]) -> str:
    existente = _texto(row.get("place_id"))
    if existente:
        return existente
    base = "|".join(
        [
            _texto(row.get("google_maps_url")) or "",
            _texto(row.get("nome")) or "",
            _texto(row.get("cidade")) or "",
            _texto(row.get("telefone_limpo")) or _texto(row.get("telefone")) or "",
        ]
    ).lower()
    return f"import:{hashlib.sha1(base.encode('utf-8')).hexdigest()}"


def _limpar_row(row: dict[str, Any]) -> dict[str, Any]:
    texto_fields = {
        "place_id",
        "nome",
        "telefone",
        "telefone_limpo",
        "whatsapp_status",
        "endereco",
        "cidade",
        "segmento",
        "regiao",
        "google_maps_url",
        "site_cadastrado",
        "sem_site_cadastrado",
        "business_status",
        "classificacao_lead",
        "prioridade",
        "oferta_principal",
        "observacao_comercial",
        "status_contato",
        "interesse",
        "motivo_perda",
        "observacao_humana",
    }
    int_fields = {"quantidade_avaliacoes", "score_oportunidade"}
    decimal_fields = {"avaliacao"}
    bool_fields = {"respondeu", "diagnostico_enviado", "reuniao_marcada", "proposta_enviada", "fechado"}

    cleaned: dict[str, Any] = {}
    for field, value in row.items():
        if field in texto_fields:
            cleaned[field] = _texto(value)
        elif field in int_fields:
            cleaned[field] = _inteiro(value)
        elif field in decimal_fields:
            cleaned[field] = _decimal(value)
        elif field in bool_fields:
            cleaned[field] = _booleano(value)
        else:
            cleaned[field] = value

    cleaned["telefone_limpo"] = _telefone_limpo(cleaned.get("telefone"), cleaned.get("telefone_limpo"))
    cleaned["whatsapp_status"] = _whatsapp_status(cleaned.get("telefone_limpo"), cleaned.get("whatsapp_status"))
    cleaned["sem_site_cadastrado"] = cleaned.get("sem_site_cadastrado") or (
        "SIM" if not cleaned.get("site_cadastrado") else "NÃO"
    )
    cleaned["status_contato"] = cleaned.get("status_contato") or "Novo"
    cleaned["place_id"] = _place_id(cleaned)
    return cleaned


def extrair_leads_xlsx(content: bytes) -> list[dict[str, Any]]:
    workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
    worksheet = workbook[workbook.sheetnames[0]]
    rows = worksheet.iter_rows(values_only=True)
    headers = next(rows, None)
    if not headers:
        return []

    mapped_headers = [COLUNAS.get(_normalizar_coluna(header)) for header in headers]
    leads: list[dict[str, Any]] = []

    for raw_row in rows:
        row: dict[str, Any] = {}
        for index, value in enumerate(raw_row):
            field = mapped_headers[index] if index < len(mapped_headers) else None
            if field and value not in (None, ""):
                row[field] = value
        cleaned = _limpar_row(row)
        if cleaned.get("nome"):
            leads.append(cleaned)

    return leads
