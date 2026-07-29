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

## Migrações

Rode os arquivos de `migrations/` em ordem no seu Postgres (Neon):

```bash
psql "$DATABASE_URL" -f migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f migrations/002_auth.sql
psql "$DATABASE_URL" -f migrations/002_search_batch_leads.sql
psql "$DATABASE_URL" -f migrations/003_campaigns.sql
```

## Autenticação

Login é por magic link (email apenas, sem senha):

1. `POST /auth/request-link {email}` cria/acha o usuário e envia um email com link via Resend.
2. Usuário clica no link (`FRONTEND_URL/auth/verify?token=...`), que troca o token por uma sessão.
3. `POST /auth/verify {token}` retorna `session_token`; endpoints protegidos exigem `Authorization: Bearer <session_token>`.

Sem `RESEND_API_KEY` configurada e fora de produção (`APP_ENV != production`), `request-link` retorna o link em `debug_link` na resposta, para testar login local sem enviar email de verdade.

Leads e lotes de busca são isolados por usuário (`user_id`).
