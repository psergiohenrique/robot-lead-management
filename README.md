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
