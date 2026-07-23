# Arquitetura — Robot Lead Management

Este documento descreve a arquitetura planejada para transformar o projeto atual de geração de leads em uma aplicação web completa, com backend Python, dashboard em Next.js/React/Tailwind, banco Neon DB e publicação na Vercel.

## 1. Visão geral do produto

O `robot-lead-management` será uma plataforma interna da Codepath para:

- buscar empresas usando a Google Places API oficial;
- identificar empresas sem site cadastrado no Google;
- organizar uma base master de leads;
- priorizar oportunidades por score/classificação;
- preparar abordagem manual por WhatsApp;
- acompanhar status comercial dos contatos;
- permitir que Codepath e sócios visualizem, filtrem e gerenciem a prospecção em dashboard.

Importante: a aplicação não deve fazer scraping do Google Maps e não deve disparar mensagens automáticas em massa. O WhatsApp será usado apenas com links de abertura manual.

## 2. Funcionalidades já existentes no backend Python

Hoje o projeto já possui três fluxos principais:

### 2.1 Busca avulsa

Arquivo atual:

```text
robot_lead_management/buscar_leads.py
```

Função:

- recebe cidade, segmento e limite;
- consulta a Google Places API New no endpoint `places:searchText`;
- coleta nome, telefone, endereço, Google Maps, avaliação, quantidade de avaliações e site cadastrado;
- identifica leads sem site pelo campo `websiteUri`;
- remove duplicados;
- gera CSV e Excel em `output/`.

### 2.2 Busca por planilha, lotes e base master

Arquivo atual:

```text
robot_lead_management/buscar_leads_planilha.py
```

Função:

- lê uma planilha com cidades, segmentos, prioridades, região e oferta;
- executa buscas por lote;
- gera arquivos separados por execução;
- mantém uma base master;
- preserva histórico antes de atualizar a master;
- calcula `score_oportunidade`;
- classifica leads como `Quente`, `Morno` ou `Frio`;
- gera base separada de empresas sem site.

### 2.3 Preparação de abordagem manual via WhatsApp

Arquivo atual:

```text
robot_lead_management/preparar_abordagem_whatsapp.py
```

Função:

- lê a base de empresas sem site;
- limpa telefones;
- identifica provável WhatsApp, telefone duvidoso ou sem telefone;
- cria mensagem personalizada por tipo de segmento;
- gera link `wa.me` usando o telefone do lead;
- cria campos comerciais de controle;
- gera planilha Excel com abas de trabalho.

## 3. Arquitetura alvo

A aplicação será organizada como monorepo:

```text
robot-lead-management/
├─ apps/
│  ├─ web/                  # Frontend Next.js + React + Tailwind
│  └─ api/                  # API Python publicada na Vercel
├─ robot_lead_management/   # Regras de negócio Python já existentes
├─ data/                    # Arquivos exemplo e seeds
├─ output/                  # Saídas locais, ignoradas pelo Git
├─ architecture.md
├─ README.md
├─ pyproject.toml
└─ requirements.txt
```

### Decisão principal

Manteremos o Python como motor das features de leads e criaremos uma API para o dashboard consumir.

O frontend não deve executar lógica de busca diretamente. Ele deve chamar endpoints do backend, e o backend conversa com Google Places API, Neon DB e serviços de exportação.

## 4. Publicação na Vercel

A proposta é usar a Vercel para frontend e backend, preferencialmente como dois projetos Vercel dentro do mesmo repositório:

| Projeto Vercel | Pasta | Responsabilidade |
| --- | --- | --- |
| `robot-leads-web` | `apps/web` | Dashboard Next.js |
| `robot-leads-api` | `apps/api` | API Python / jobs de leads |

Essa separação evita misturar runtime Node/Next.js com runtime Python no mesmo deploy e facilita escalar, configurar variáveis e depurar problemas.

Mesmo ficando em dois projetos, ambos continuam no mesmo repositório GitHub.

## 5. Frontend

Stack:

- Next.js;
- React;
- Tailwind CSS;
- TypeScript recomendado;
- publicação na Vercel.

### 5.1 Páginas principais

#### Dashboard

Visão geral da operação comercial:

- total de leads;
- leads sem site;
- leads quentes;
- leads com provável WhatsApp;
- contatos feitos;
- respostas recebidas;
- reuniões marcadas;
- propostas enviadas;
- fechamentos.

#### Leads

Tabela principal com filtros:

- cidade;
- segmento;
- prioridade;
- região;
- classificação;
- score;
- sem site;
- status do WhatsApp;
- status comercial.

#### Lotes de busca

Área para:

- criar novo lote;
- selecionar cidade/segmento/prioridade;
- acompanhar progresso;
- ver erros de API;
- abrir resultados do lote;
- consolidar na base master.

#### Abordagem WhatsApp

Área para contato manual:

- lista dos melhores leads;
- botão para abrir WhatsApp;
- mensagem pronta para copiar;
- status do contato;
- data do primeiro contato;
- próximo follow-up;
- interesse;
- motivo de perda;
- observações humanas.

#### Templates comerciais

Área para configurar mensagens:

- Saúde;
- B2B;
- Premium/Portfólio;
- Local/Geral.

As mensagens devem preservar o tom consultivo e não agressivo.

#### Configurações

Área para:

- chave pública de URLs do frontend;
- segmentos estratégicos;
- pesos do score;
- usuários internos;
- integração com Google Places API;
- parâmetros da promoção atual.

## 6. Backend

Stack proposta:

- Python;
- FastAPI ou funções serverless Python na Vercel;
- Neon DB/Postgres;
- SQLAlchemy ou SQLModel;
- Alembic para migrations;
- OpenPyXL para exportações Excel;
- Requests ou HTTPX para Google Places API.

### 6.1 Responsabilidades do backend

O backend deve concentrar:

- autenticação/autorização;
- conexão com Neon DB;
- chamadas à Google Places API;
- deduplicação de leads;
- cálculo ou preservação de score;
- geração de mensagens;
- geração de links WhatsApp;
- exportação CSV/XLSX;
- auditoria de alterações comerciais;
- criação e processamento de jobs de busca.

### 6.2 Por que não deixar isso no frontend?

Porque o frontend roda no navegador do usuário. Ele não deve receber:

- chave da Google Places API;
- `DATABASE_URL` do Neon;
- regras internas de score;
- detalhes sensíveis dos jobs.

Esses dados devem ficar somente no servidor.

## 7. Conexão backend/frontend

Fluxo principal:

```text
Usuário
  ↓
Dashboard Next.js / React
  ↓
API interna do frontend ou chamada HTTPS
  ↓
Backend Python
  ↓
Neon DB + Google Places API
```

### 7.1 Comunicação recomendada

O frontend deve consumir o backend via HTTP/JSON.

Exemplo de variável no frontend:

```text
NEXT_PUBLIC_APP_URL=https://robot-leads-web.vercel.app
API_BASE_URL=https://robot-leads-api.vercel.app
```

Observação:

- variáveis com `NEXT_PUBLIC_` podem aparecer no navegador;
- segredos como `DATABASE_URL` e `GOOGLE_PLACES_API_KEY` nunca devem usar `NEXT_PUBLIC_`.

### 7.2 Endpoints iniciais sugeridos

```text
GET    /health
GET    /dashboard/summary

GET    /leads
GET    /leads/{lead_id}
PATCH  /leads/{lead_id}

POST   /search-batches
GET    /search-batches
GET    /search-batches/{batch_id}
POST   /search-batches/{batch_id}/run

POST   /whatsapp/prepare
GET    /whatsapp/top-leads

POST   /exports
GET    /exports/{export_id}
```

### 7.3 Exemplo de fluxo de busca

1. Usuário cria um lote no dashboard.
2. Frontend envia cidade, segmento, prioridade e limite para o backend.
3. Backend cria um registro `search_batches` no Neon com status `pending`.
4. Backend processa a busca em partes para evitar timeout.
5. Cada lead encontrado é salvo ou atualizado no Neon.
6. Deduplicação usa `place_id` quando disponível.
7. Se não houver `place_id`, usa chave normalizada com nome, endereço e telefone.
8. Dashboard consulta o status do lote.
9. Ao finalizar, o usuário vê os leads na tela e pode exportar.

## 8. Neon DB

Neon será o banco Postgres central da aplicação.

### 8.1 Variáveis de ambiente

Backend:

```text
DATABASE_URL=postgresql://...
GOOGLE_PLACES_API_KEY=...
APP_ENV=production
```

Frontend:

```text
API_BASE_URL=https://robot-leads-api.vercel.app
NEXT_PUBLIC_APP_URL=https://robot-leads-web.vercel.app
```

### 8.2 Tabelas iniciais sugeridas

#### `leads`

Armazena a empresa.

Campos principais:

- `id`;
- `place_id`;
- `nome`;
- `telefone`;
- `telefone_limpo`;
- `whatsapp_status`;
- `endereco`;
- `cidade`;
- `segmento`;
- `regiao`;
- `google_maps_url`;
- `avaliacao`;
- `quantidade_avaliacoes`;
- `site_cadastrado`;
- `sem_site_cadastrado`;
- `business_status`;
- `score_oportunidade`;
- `classificacao_lead`;
- `prioridade`;
- `oferta_principal`;
- `observacao_comercial`;
- `created_at`;
- `updated_at`.

#### `search_batches`

Armazena cada lote de busca.

Campos principais:

- `id`;
- `nome_lote`;
- `status`;
- `prioridade`;
- `total_planejado`;
- `total_processado`;
- `total_leads`;
- `total_sem_site`;
- `erro`;
- `created_at`;
- `started_at`;
- `finished_at`.

#### `search_batch_items`

Armazena cada cidade/segmento dentro de um lote.

Campos principais:

- `id`;
- `batch_id`;
- `cidade`;
- `segmento`;
- `limite`;
- `query_base`;
- `status`;
- `erro`;
- `created_at`;
- `finished_at`.

#### `lead_contacts`

Armazena histórico comercial do lead.

Campos principais:

- `id`;
- `lead_id`;
- `status_contato`;
- `data_primeiro_contato`;
- `data_ultimo_contato`;
- `proximo_followup`;
- `respondeu`;
- `interesse`;
- `diagnostico_enviado`;
- `reuniao_marcada`;
- `proposta_enviada`;
- `fechado`;
- `motivo_perda`;
- `observacao_humana`;
- `updated_by`;
- `created_at`;
- `updated_at`.

#### `message_templates`

Armazena modelos de mensagem por tipo de abordagem.

Campos principais:

- `id`;
- `nome`;
- `abordagem_tipo`;
- `conteudo`;
- `ativo`;
- `created_at`;
- `updated_at`.

#### `exports`

Armazena histórico de exportações.

Campos principais:

- `id`;
- `tipo`;
- `status`;
- `filtros_json`;
- `arquivo_url`;
- `erro`;
- `created_at`;
- `finished_at`.

## 9. Jobs e processamento

Buscas com Google Places podem demorar e podem bater em limite de tempo de função serverless.

Por isso, a arquitetura deve trabalhar com jobs:

- o dashboard cria o job;
- o backend salva o job no Neon;
- o processamento acontece em partes;
- cada parte atualiza o progresso;
- o dashboard consulta o status.

Estados sugeridos:

```text
pending
running
completed
failed
cancelled
```

Se a execução em serverless ficar curta demais para lotes grandes, a solução continua usando Vercel para dashboard/API, mas o processamento pesado pode evoluir para:

- Vercel Cron chamando processamento em partes;
- worker externo no futuro;
- execução manual local conectada ao mesmo Neon DB.

## 10. Segurança

Regras principais:

- `.env` nunca deve ir para o GitHub;
- `GOOGLE_PLACES_API_KEY` fica só no backend;
- `DATABASE_URL` fica só no backend e em rotas server-side;
- frontend não acessa Neon diretamente pelo navegador;
- todas as alterações comerciais devem registrar data e usuário;
- exportações devem respeitar permissão do usuário;
- links WhatsApp não devem disparar mensagens automaticamente.

## 11. Deploy

### 11.1 Vercel — frontend

Projeto:

```text
robot-leads-web
```

Root directory:

```text
apps/web
```

Variáveis:

```text
API_BASE_URL
NEXT_PUBLIC_APP_URL
```

### 11.2 Vercel — backend

Projeto:

```text
robot-leads-api
```

Root directory:

```text
apps/api
```

Variáveis:

```text
DATABASE_URL
GOOGLE_PLACES_API_KEY
APP_ENV
```

### 11.3 Neon DB

Criar um projeto Neon para produção e, se necessário, branches separados para preview/staging.

Ambientes sugeridos:

- `development`;
- `preview`;
- `production`.

## 12. Próximas fases de implementação

### Fase 1 — Preparar backend para API

- Separar regras de negócio dos scripts CLI;
- criar serviços Python reutilizáveis;
- adicionar conexão Neon;
- criar migrations;
- criar endpoints HTTP.

### Fase 2 — Criar dashboard Next.js

- criar app em `apps/web`;
- instalar Tailwind;
- criar layout base;
- criar telas de dashboard, leads e abordagem;
- conectar com API.

### Fase 3 — Persistência real no Neon

- migrar base master para Neon;
- salvar leads no banco;
- salvar histórico de contato;
- criar filtros e paginação.

### Fase 4 — Operação comercial

- controle de usuários;
- permissões;
- exportações;
- templates editáveis;
- métricas de conversão.

### Fase 5 — Automação segura

- lembretes de follow-up;
- geração de diagnóstico;
- sugestões de próximos contatos;
- sem disparo automático em massa.

## 13. Referências técnicas

- Next.js Route Handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Variáveis de ambiente no Next.js: https://nextjs.org/docs/app/guides/environment-variables
- Variáveis de ambiente na Vercel: https://vercel.com/docs/environment-variables
- Postgres na Vercel / integrações externas: https://vercel.com/docs/postgres
- Neon na Vercel Marketplace: https://vercel.com/marketplace/neon/neon
