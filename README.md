# Robot Lead Management

Aplicação Python da Codepath para buscar leads com a Google Places API, manter uma base master e preparar uma planilha de abordagem manual pelo WhatsApp.

O projeto usa apenas API oficial do Google. Não faz scraping do Google Maps.

## O que a aplicação faz

- Busca empresas por cidade e segmento usando Google Places API New (`places:searchText`).
- Identifica empresas sem site cadastrado no perfil do Google pelo campo `websiteUri`.
- Gera arquivos CSV e Excel.
- Mantém uma base master sem sobrescrever lotes anteriores.
- Calcula score e classificação comercial dos leads.
- Gera uma planilha de abordagem manual via WhatsApp para empresas sem site.
- Cria mensagens prontas e links `wa.me`, mas não envia mensagens automaticamente.

## Estrutura atual do repositório

```text
robot-lead-management/
├─ apps/
│  ├─ api/                  # API Python/FastAPI preparada para Neon DB
│  └─ web/                  # Dashboard Next.js/React/Tailwind
├─ robot_lead_management/   # Motor Python de leads já existente
├─ data/                    # Arquivos de exemplo
├─ output/                  # Saídas locais ignoradas pelo Git
├─ architecture.md          # Arquitetura backend/frontend/Neon/Vercel
└─ README.md
```

## Dashboard web e API

A evolução do produto está documentada em `architecture.md`.

Nesta primeira versão de aplicação web foram criadas duas pastas:

- `apps/api`: backend HTTP em Python/FastAPI, com endpoints iniciais e conexão preparada para Neon DB.
- `apps/web`: frontend em Next.js, React e Tailwind, pronto para ser publicado na Vercel.

### Rodar a API localmente

```powershell
cd apps\api
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env
notepad .env
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Teste:

```text
http://localhost:8000/health
```

### Rodar o dashboard localmente

Em outro PowerShell:

```powershell
cd apps\web
npm install
copy .env.example .env.local
npm run dev
```

Acesse:

```text
http://localhost:3000
```

Na listagem de leads do dashboard, cada lead com telefone válido mostra o botão **Abrir WhatsApp**. Esse botão cria um link `wa.me` com:

- telefone do próprio lead;
- mensagem promocional da Codepath já preenchida;
- personalização por cidade e segmento quando esses dados existirem.

O envio continua manual: o usuário abre o WhatsApp, revisa a conversa e confirma o envio.

A tabela também possui filtros por cidade, segmento, classificação e situação do site, além de paginação por URL.

### Como navegar entre as bases de leads

A dashboard trabalha com uma base única de leads e algumas visões para facilitar o trabalho comercial:

- **Todos os leads**: mostra a base geral consolidada, com empresas com site e sem site.
- **Sem site**: mostra apenas as empresas sem site cadastrado no Google. Esta é a principal fila para primeira abordagem comercial.
- **Por pesquisa**: mostra os leads encontrados em uma busca anterior, por exemplo "dentista em Maringá" ou "clínica médica em Campinas".

Na prática, quando uma nova pesquisa é feita:

1. os leads entram ou são atualizados na base geral;
2. se não tiverem site, também aparecem automaticamente na visão **Sem site**;
3. a pesquisa fica registrada no histórico de lotes;
4. os leads encontrados ficam ligados a essa pesquisa, sem duplicar o cadastro principal.

O mais importante: o **status de contato fica salvo no lead**, não na tela. Então, se você marcar um lead como `Primeiro contato`, `Respondeu` ou `Reunião marcada`, esse status continua aparecendo quando você abrir a base geral, a lista sem site ou uma pesquisa antiga.

Isso permite voltar dias depois em uma cidade/segmento já pesquisado e retomar exatamente de onde parou.

Para guardar a ligação entre pesquisas e leads, existe a migration:

```text
apps/api/migrations/002_search_batch_leads.sql
```

A API também tenta criar essa tabela automaticamente quando necessário, para evitar trabalho manual durante o uso normal.

### Campanhas de prospecção

A dashboard agora possui o conceito de **Campanha**. Uma campanha representa uma frente comercial, por exemplo:

```text
Venda de site institucional
```

Cada campanha pode ter nome, objetivo, oferta principal, critério principal, canal de abordagem e status.

Quando uma nova busca é feita, ela fica vinculada a uma campanha. Isso permite separar, por exemplo:

- venda de sites para empresas sem site;
- redesign de sites antigos;
- projetos de sistema sob medida;
- campanhas futuras de SEO local ou presença digital.

O MVP começa com a campanha padrão **Venda de site institucional**, focada em empresas sem site cadastrado no Google.

Na prática:

1. escolha ou crie uma campanha;
2. faça uma busca de cidade + segmento dentro dela;
3. os leads entram na base geral;
4. a campanha passa a mostrar quantas buscas, leads e leads sem site ela gerou.

Isso prepara o produto para mudar a lógica de busca e score por campanha nas próximas sprints.

### Kanban comercial

A rota `/kanban` mostra os leads em formato de funil comercial:

```text
Novo → Primeiro contato → Respondeu → Diagnóstico enviado → Reunião marcada → Proposta → Fechado → Perdido
```

Essa visão é pensada para acompanhar a operação diária de prospecção:

- escolher uma campanha;
- ver os leads separados por etapa;
- abrir o WhatsApp manualmente;
- mudar o status do lead direto no card;
- voltar para a dashboard/tabela quando precisar trabalhar com filtros e paginação.

O status continua sendo salvo no próprio lead. Então uma mudança feita no Kanban também aparece na tabela, e uma mudança feita na tabela também aparece no Kanban.

### Neon DB

O banco será Postgres no Neon. A API espera a variável:

```text
DATABASE_URL=postgresql://USUARIO:SENHA@HOST.neon.tech/NOME_DO_BANCO?sslmode=require
```

O schema inicial está em:

```text
apps/api/migrations/001_initial_schema.sql
apps/api/migrations/002_auth.sql
apps/api/migrations/002_search_batch_leads.sql
apps/api/migrations/003_campaigns.sql
```

### Vercel

Publicaremos como dois projetos Vercel apontando para o mesmo repositório:

| Projeto | Root directory | Função |
| --- | --- | --- |
| `robot-leads-api` | `apps/api` | Backend Python/FastAPI |
| `robot-leads-web` | `apps/web` | Dashboard Next.js |

Variáveis principais da API:

```text
DATABASE_URL
GOOGLE_PLACES_API_KEY
APP_ENV
ALLOWED_ORIGINS
```

Variáveis principais do web:

```text
API_BASE_URL
NEXT_PUBLIC_APP_URL
```

## Instalação no Windows

Abra o PowerShell na pasta do projeto e execute:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Não é obrigatório ativar o ambiente virtual. Os comandos abaixo usam o Python direto da `.venv`.

## Configurar a chave da Google Places API

Crie uma cópia do arquivo `.env.example` com o nome `.env`:

```powershell
copy .env.example .env
notepad .env
```

Preencha assim:

```text
GOOGLE_PLACES_API_KEY=SUA_CHAVE_REAL
```

Importante: nunca suba o arquivo `.env` para o GitHub.

## Busca avulsa

Exemplo:

```powershell
.\.venv\Scripts\python.exe buscar_leads.py --cidade "São José do Rio Preto SP" --segmento "dentista" --limite 100
```

Também funciona pela CLI central:

```powershell
.\.venv\Scripts\robot-leads.exe buscar --cidade "São José do Rio Preto SP" --segmento "dentista" --limite 100
```

Arquivos gerados:

- `output/leads.csv`
- `output/leads.xlsx`

## Busca por planilha e base master

Use uma planilha com estas colunas:

- Cidade
- Segmento
- Prioridade
- Região
- Limite Leads
- Oferta Principal
- Observação Comercial
- Query Base

Há um exemplo em `data/base_leads.example.csv`.

Rodar prioridade Alta:

```powershell
.\.venv\Scripts\python.exe buscar_leads_planilha.py --arquivo "base_leads.xlsx" --prioridade "Alta"
```

Rodar todas as prioridades:

```powershell
.\.venv\Scripts\python.exe buscar_leads_planilha.py --arquivo "base_leads.xlsx" --prioridade "Todas"
```

Rodar um lote específico:

```powershell
.\.venv\Scripts\python.exe buscar_leads_planilha.py --arquivo "base_leads.xlsx" --prioridade "Alta" --cidade "São José do Rio Preto SP" --segmentos "dentista" "clínica médica" --nome-lote "rio-preto-saude"
```

A aplicação gera uma pasta por lote em:

```text
output/lotes/
```

E atualiza a base master em:

```text
output/master/
```

## Preparar abordagem manual via WhatsApp

Depois de gerar a base de empresas sem site, execute:

```powershell
.\.venv\Scripts\python.exe preparar_abordagem_whatsapp.py
```

Ou pela CLI central:

```powershell
.\.venv\Scripts\robot-leads.exe preparar-whatsapp
```

Arquivo final:

```text
output/abordagem_whatsapp_sem_site.xlsx
```

Essa planilha é para contato manual e controlado. Ela não envia mensagens automáticas.

O campo `link_whatsapp` abre a conversa com o telefone do próprio lead e já deixa a mensagem preenchida. Revise tudo antes de enviar.

## Abas da planilha de abordagem

- `base_abordagem_completa`: todos os leads sem site.
- `top_50_primeira_abordagem`: os 50 melhores leads para começar.
- `leads_sem_telefone`: empresas sem telefone válido.
- `leads_verificar_telefone`: telefones fixos ou duvidosos.
- `resumo`: visão geral da base.

## Promoção usada nas mensagens

A mensagem atual apresenta a Codepath e foca na promoção de site institucional:

```text
Site institucional completo
R$ 499 à vista
+ R$ 129,90/mês de manutenção, suporte e cuidados contínuos do site enquanto a Codepath cuidar dele
```

Também inclui:

- Site profissional
- Layout responsivo
- Estrutura pensada para o Google
- Suporte direto da Codepath

Site promocional:

```text
https://promocao.codepath.dev.br/
```

Instagram:

```text
@codepath.softwares
```

## Uso responsável

- Não faça disparo em massa.
- Revise a empresa antes do contato.
- Respeite pedidos para não receber novas mensagens.
- Identifique a Codepath com clareza.
- Não prometa resultado garantido.

## Erros comuns

**Erro de chave da API:** confira se o arquivo `.env` existe e se `GOOGLE_PLACES_API_KEY` está preenchida.

**Erro 403:** geralmente é API desativada, faturamento ausente ou restrição incorreta na chave.

**Erro 429:** a cota da API foi atingida. Aguarde ou revise os limites no Google Cloud.

**Erro ao salvar Excel:** feche a planilha se ela estiver aberta e rode novamente.
