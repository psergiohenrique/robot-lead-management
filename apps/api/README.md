# API — Robot Lead Management

API Python que expõe as features do motor de leads para o dashboard.

## Rodar localmente

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## Variáveis de ambiente

Crie um `.env` a partir de `.env.example`.

```text
DATABASE_URL=postgresql://...
GOOGLE_PLACES_API_KEY=...
APP_ENV=development
```

Sem `DATABASE_URL`, a API sobe em modo seguro/local e retorna listas vazias em endpoints que dependem do banco.
