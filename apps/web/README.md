# Web — Robot Lead Management

Dashboard Next.js/React/Tailwind para acompanhar leads, lotes e abordagem manual via WhatsApp.

## Rodar localmente

```powershell
npm install
npm run dev
```

Depois acesse:

```text
http://localhost:3000
```

## Variáveis de ambiente

Crie `.env.local` a partir de `.env.example`.

```text
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`API_BASE_URL` fica no servidor do Next.js. Não coloque chaves secretas no frontend.
