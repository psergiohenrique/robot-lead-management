from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from fastapi import Header, HTTPException

from app.config import get_settings
from app.db import database_configured, get_connection

RESEND_API_URL = "https://api.resend.com/emails"

logger = logging.getLogger("app.auth")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _get_or_create_user(cursor: Any, email: str) -> dict[str, Any]:
    email = email.strip().lower()
    cursor.execute("SELECT id, email FROM users WHERE email = %(email)s", {"email": email})
    user = cursor.fetchone()
    if user:
        return dict(user)
    cursor.execute(
        "INSERT INTO users (email) VALUES (%(email)s) RETURNING id, email",
        {"email": email},
    )
    return dict(cursor.fetchone())


def _send_magic_link_email(email: str, link: str) -> None:
    settings = get_settings()
    if not settings.resend_api_key:
        return
    try:
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.email_from,
                "to": [email],
                "subject": "Seu link de acesso — Robot Lead Management",
                "html": (
                    f"<p>Clique no link abaixo para entrar (válido por "
                    f"{settings.magic_link_ttl_minutes} minutos):</p>"
                    f'<p><a href="{link}">{link}</a></p>'
                ),
            },
            timeout=10,
        )
        if not response.ok:
            logger.error("Falha ao enviar magic link via Resend para %s: %s %s", email, response.status_code, response.text)
    except requests.RequestException:
        logger.exception("Erro de conexão ao enviar magic link via Resend para %s", email)


def request_magic_link(email: str) -> str | None:
    if not database_configured():
        raise HTTPException(status_code=503, detail="DATABASE_URL não configurada.")

    settings = get_settings()
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.magic_link_ttl_minutes)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            user = _get_or_create_user(cursor, email)
            cursor.execute(
                """
                INSERT INTO magic_links (user_id, token_hash, expires_at)
                VALUES (%(user_id)s, %(token_hash)s, %(expires_at)s)
                """,
                {"user_id": user["id"], "token_hash": token_hash, "expires_at": expires_at},
            )
        connection.commit()

    link = f"{settings.frontend_url}/auth/verify?token={token}"
    _send_magic_link_email(user["email"], link)

    if not settings.resend_api_key and settings.app_env != "production":
        return link
    return None


def verify_magic_link(token: str) -> dict[str, Any]:
    if not database_configured():
        raise HTTPException(status_code=503, detail="DATABASE_URL não configurada.")

    token_hash = _hash_token(token)
    now = datetime.now(timezone.utc)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT ml.id, ml.user_id, ml.expires_at, ml.used_at, u.email
                FROM magic_links ml
                JOIN users u ON u.id = ml.user_id
                WHERE ml.token_hash = %(token_hash)s
                """,
                {"token_hash": token_hash},
            )
            magic_link = cursor.fetchone()
            if not magic_link:
                raise HTTPException(status_code=400, detail="Link inválido.")
            if magic_link["used_at"] is not None:
                raise HTTPException(status_code=400, detail="Link já utilizado.")
            if magic_link["expires_at"] < now:
                raise HTTPException(status_code=400, detail="Link expirado.")

            cursor.execute(
                "UPDATE magic_links SET used_at = now() WHERE id = %(id)s",
                {"id": magic_link["id"]},
            )

            settings = get_settings()
            session_token = secrets.token_urlsafe(32)
            session_token_hash = _hash_token(session_token)
            session_expires_at = now + timedelta(days=settings.session_ttl_days)
            cursor.execute(
                """
                INSERT INTO sessions (user_id, token_hash, expires_at)
                VALUES (%(user_id)s, %(token_hash)s, %(expires_at)s)
                """,
                {
                    "user_id": magic_link["user_id"],
                    "token_hash": session_token_hash,
                    "expires_at": session_expires_at,
                },
            )
        connection.commit()

    return {
        "session_token": session_token,
        "user": {"id": magic_link["user_id"], "email": magic_link["email"]},
    }


def get_user_by_session_token(session_token: str) -> dict[str, Any] | None:
    if not database_configured():
        return None

    token_hash = _hash_token(session_token)
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT u.id, u.email, s.expires_at
                FROM sessions s
                JOIN users u ON u.id = s.user_id
                WHERE s.token_hash = %(token_hash)s
                """,
                {"token_hash": token_hash},
            )
            row = cursor.fetchone()
            if not row:
                return None
            if row["expires_at"] < datetime.now(timezone.utc):
                return None
            return {"id": row["id"], "email": row["email"]}


def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado.")
    token = authorization.split(" ", 1)[1].strip()
    user = get_user_by_session_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada.")
    return user
