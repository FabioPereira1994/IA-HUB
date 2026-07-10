# AI Customer Hub — Backend (Sprint 1 + Sprint 2)

API em Node.js + Express para a plataforma AI Customer Hub. Cobre:

- **Sprint 1**: Login, Empresas, Dashboard básico, Estrutura de banco
- **Sprint 2**: Inbox de atendimento, webhook do WhatsApp (Evolution API),
  agente de IA orquestrado via n8n, base de conhecimento (busca vetorial)

## Estrutura do projeto

```
ai-customer-hub-backend/
├── src/                     # API (Express)
├── db/                      # schema.sql + seed.sql
├── n8n/                     # workflow importável do agente de IA
├── frontend-prototype/      # protótipo React (Dashboard + Inbox), ainda mockado
└── README.md
```

## Stack

- Node.js 18+ / Express (usa o `fetch` nativo — sem dependência extra de HTTP client)
- PostgreSQL (com extensões `pgcrypto`, `pg_trgm`, `vector`)
- Autenticação via JWT
- Multi-tenant com `empresa_id` em cada tabela + Row Level Security como
  segunda camada de proteção
- WhatsApp via **Evolution API** (self-hosted)
- Embeddings e decisão do agente via **OpenAI**, orquestrados pelo **n8n**

## Arquitetura da conversa (Sprint 2)

```
WhatsApp ─▶ Evolution API ─▶ POST /api/webhooks/whatsapp (este backend)
                                     │
                                     ├─ acha/cria cliente + conversa
                                     ├─ salva a mensagem do cliente
                                     ├─ monta contexto (histórico, config
                                     │  do agente, busca vetorial na base
                                     │  de conhecimento)
                                     ▼
                              POST no webhook do n8n (síncrono)
                                     │
                                     ├─ n8n monta o prompt
                                     ├─ n8n chama a OpenAI
                                     ▼
                              devolve { acao, resposta, chamado }
                                     │
                                     ├─ salva a resposta da IA (se houver)
                                     ├─ atualiza status da conversa
                                     ├─ abre chamado (se acao = abrir_chamado)
                                     ▼
                              Evolution API ─▶ WhatsApp do cliente
```

Quando um atendente humano responde pelo Inbox (`POST /api/conversas/:id/mensagens`),
o caminho final é o mesmo: o backend chama o Evolution API. IA e humano
nunca competem por quem envia — só muda quem decidiu o texto.

Enquanto uma conversa está com `status = 'humano'`, o webhook só salva as
mensagens do cliente e não aciona a IA/n8n — quem responde é o atendente.

## Como rodar

### 1. Pré-requisitos

- Node.js 18 ou superior
- PostgreSQL 15+ com a extensão `pgvector` disponível (no Supabase já
  vem pronta; localmente, instale o pacote `pgvector` antes de rodar
  o schema)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com a `DATABASE_URL` do seu Postgres e um `JWT_SECRET`
forte (`openssl rand -hex 32` gera um bom valor).

### 4. Criar o banco e rodar o schema

```bash
createdb ai_customer_hub
npm run db:schema
npm run db:seed   # opcional: popula com a empresa de exemplo "Clínica Vitalis"
```

### 5. Subir a API

```bash
npm run dev     # com reload automático (nodemon)
# ou
npm start
```

A API sobe em `http://localhost:3000` por padrão.

### 6. Configurar o n8n

1. Importe `n8n/decisao-atendimento.json` no seu n8n (Workflows → Import from File).
2. No node **Verificar Segredo**, troque o valor fixo pelo mesmo texto usado
   em `N8N_WEBHOOK_SECRET` no `.env` do backend.
3. Garanta que `OPENAI_API_KEY` esteja acessível ao n8n como variável de
   ambiente (ou substitua o node **Chamar OpenAI** por uma credencial HTTP
   Header Auth — mais seguro que referenciar `$env` direto nas expressões).
4. Ative o workflow e copie a URL do node **Webhook** para `N8N_WEBHOOK_URL`
   no `.env` do backend.
5. Revise o modelo usado (`gpt-5-mini`, no node **Chamar OpenAI**) contra a
   documentação atual da OpenAI antes de ir para produção — nomes e preços
   de modelo mudam com frequência.

### 7. Conectar o Evolution API

1. Crie uma instância no seu servidor Evolution API.
2. Configure o webhook da instância pra apontar pro seu backend, escutando
   pelo menos o evento `MESSAGES_UPSERT`:
   ```json
   {
     "webhook": {
       "enabled": true,
       "url": "https://seu-backend.exemplo.com/api/webhooks/whatsapp",
       "headers": { "x-webhook-secret": "o-mesmo-valor-de-EVOLUTION_WEBHOOK_SECRET" },
       "events": ["MESSAGES_UPSERT"]
     }
   }
   ```
3. Insira (ou atualize via `PATCH` futuro) uma linha em `integracoes_whatsapp`
   com o `instancia` (nome da instância no Evolution API) e o `token_acesso`
   (apikey da instância) — é assim que o backend identifica qual empresa
   corresponde a cada mensagem recebida.

## Endpoints (Sprint 1)

### Autenticação — `/api/auth`

| Método | Rota                | Autenticação | Descrição                                   |
|--------|----------------------|:---:|-----------------------------------------------------|
| POST   | `/registro`          | –   | Cria a empresa + o primeiro usuário (administrador) |
| POST   | `/login`              | –   | Autentica e devolve um JWT                          |
| POST   | `/esqueci-senha`      | –   | Gera token de recuperação (por enquanto, só loga no console) |
| POST   | `/redefinir-senha`    | –   | Troca a senha usando o token de recuperação          |
| GET    | `/me`                 | ✅  | Retorna o usuário logado e a empresa                 |

Exemplo de cadastro:

```bash
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nomeEmpresa": "Clínica Vitalis",
    "cnpj": "12.345.678/0001-90",
    "nomeResponsavel": "Fernanda Souza",
    "email": "fernanda@clinicavitalis.com.br",
    "senha": "senha-super-segura"
  }'
```

A resposta traz `{ token, usuario, empresa }`. Use o `token` no header
`Authorization: Bearer <token>` nas rotas protegidas.

### Empresas — `/api/empresas`

| Método | Rota   | Papel exigido    | Descrição                  |
|--------|--------|------------------|-----------------------------|
| GET    | `/me`  | qualquer logado  | Dados da empresa atual      |
| PATCH  | `/me`  | administrador    | Atualiza o nome da empresa  |

### Dashboard — `/api/dashboard`

| Método | Rota | Query params            | Descrição                              |
|--------|------|--------------------------|------------------------------------------|
| GET    | `/`  | `range=hoje\|7dias\|30dias` | KPIs e gráfico, no mesmo formato consumido pelo protótipo React |

```bash
curl http://localhost:3000/api/dashboard?range=hoje \
  -H "Authorization: Bearer <token>"
```

### Inbox de atendimento — `/api/conversas`

| Método | Rota                    | Descrição                                              |
|--------|-------------------------|----------------------------------------------------------|
| GET    | `/`                     | Lista conversas. Query params: `categoria` (`vendas`\|`suporte`), `status` (`ia`\|`humano`\|`pendente`), `busca` (nome do cliente) |
| GET    | `/:id`                  | Detalhe: mensagens, notas internas e perfil completo do cliente (tags, histórico, chamados) |
| POST   | `/:id/mensagens`        | Atendente responde manualmente — envia pelo Evolution API e salva no histórico |
| POST   | `/:id/transferir`       | Atendente assume a conversa (`status` → `humano`)        |
| POST   | `/:id/encerrar`         | Marca o atendimento como resolvido                       |
| POST   | `/:id/notas`            | Adiciona nota interna (nunca visível ao cliente)          |

### Clientes — `/api/clientes`

| Método | Rota   | Descrição                                    |
|--------|--------|------------------------------------------------|
| GET    | `/:id` | Perfil completo (tags, histórico, chamados)     |

### Webhook do WhatsApp — `/api/webhooks`

| Método | Rota         | Autenticação                          | Descrição                       |
|--------|--------------|----------------------------------------|-----------------------------------|
| POST   | `/whatsapp`  | Header `x-webhook-secret`             | Recebido do Evolution API a cada mensagem (`MESSAGES_UPSERT`) |

Esse endpoint não usa JWT — quem chama é o Evolution API, não um usuário
logado. A validação é o header `x-webhook-secret`, que precisa bater com
`EVOLUTION_WEBHOOK_SECRET`.

## Padrão de isolamento entre empresas

Toda tabela sensível tem `empresa_id`. Duas camadas garantem que uma
empresa nunca veja dados de outra:

1. **Aplicação**: toda query nos `services/*` filtra explicitamente por
   `empresa_id` (parâmetro vindo do JWT, nunca do corpo da requisição).
2. **Banco (RLS)**: `db/schema.sql` habilita Row Level Security nas
   tabelas `clientes`, `conversas`, `tickets` e `leads`, usando a
   variável de sessão `app.empresa_id`. `src/config/db.js` expõe
   `withTenant(empresaId, fn)`, que abre uma transação, faz
   `SET LOCAL app.empresa_id = ...` e só então executa a query — assim
   o RLS funciona corretamente mesmo com um pool de conexões
   compartilhado.

Login e cadastro usam `withoutTenant`, já que ainda não existe uma
empresa "logada" nesse momento (a busca de usuário por e-mail é global).

## Limitações conhecidas deste Sprint 2

- **Tempo real**: o Inbox ainda depende de polling (chamar `GET /api/conversas`
  periodicamente) — não há WebSocket/SSE ainda.
- **Base de conhecimento**: a busca vetorial (`baseConhecimento.service.js`)
  já funciona, mas o pipeline que POPULA `documento_chunks` (upload de
  PDF/DOCX, split, geração de embeddings) é do Sprint 3. Até lá, o agente
  responde sem contexto de documentos.
- **Perfil do WhatsApp**: novos clientes são criados com o nome = telefone;
  dá pra melhorar isso lendo o campo `pushName` do payload do Evolution API.

## Próximos passos (Sprint 3 do playbook)

- Upload de documentos (PDF/DOCX/TXT), split e geração de embeddings —
  populando de fato a base de conhecimento
- Configuração do agente pela UI (`/api/configuracoes-ia`)
- Conectar o protótipo React (`dashboard-inbox-prototype.jsx`) às rotas
  reais de `/api/conversas`, no lugar dos dados mockados
- Canal de tempo real para o Inbox (WebSocket ou Server-Sent Events)
