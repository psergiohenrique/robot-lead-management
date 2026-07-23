from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.config import get_settings


def database_configured() -> bool:
    return bool(get_settings().database_url)


@contextmanager
def get_connection() -> Iterator[psycopg.Connection[dict[str, Any]]]:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL não configurada.")

    with psycopg.connect(settings.database_url, row_factory=dict_row) as connection:
        yield connection
