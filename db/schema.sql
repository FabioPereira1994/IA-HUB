-- =====================================================================
-- AI CUSTOMER HUB — Estrutura de banco de dados (PostgreSQL)
-- Sprint 1 do playbook: schema cobrindo os Módulos 1–10
--
-- Extensões necessárias:
--   pgcrypto  -> geração de UUID e hash de senha (crypt/gen_salt)
--   pg_trgm   -> busca de clientes por nome (parecido com ILIKE, mais rápido)
--   vector    -> embeddings da base de conhecimento (pgvector / Supabase Vector)
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
CREATE TYPE papel_usuario        AS ENUM ('administrador', 'atendente', 'gestor');
CREATE TYPE status_conversa      AS ENUM ('ia', 'humano', 'pendente');
CREATE TYPE categoria_conversa   AS ENUM ('vendas', 'suporte');
CREATE TYPE autor_mensagem       AS ENUM ('cliente', 'ia', 'atendente', 'sistema');
CREATE TYPE tipo_mensagem        AS ENUM ('texto', 'imagem', 'documento', 'audio', 'template');
CREATE TYPE etapa_lead           AS ENUM ('novo_lead', 'qualificado', 'proposta', 'negociacao', 'fechado', 'perdido');
CREATE TYPE status_ticket        AS ENUM ('aberto', 'em_analise', 'resolvido');
CREATE TYPE prioridade_ticket    AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE status_documento     AS ENUM ('processando', 'pronto', 'erro');
CREATE TYPE tom_agente           AS ENUM ('profissional', 'amigavel', 'tecnico');

-- ---------------------------------------------------------------------
-- Função utilitária: atualiza "atualizado_em" automaticamente em UPDATE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- MÓDULO 1 — Autenticação e Empresas
-- Estrutura multiempresa: cada empresa tem usuários, clientes e
-- configurações próprias. O isolamento entre empresas (RLS) fica no
-- fim deste arquivo.
-- =====================================================================

CREATE TABLE empresas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           VARCHAR(200) NOT NULL,
  cnpj           VARCHAR(18)  NOT NULL UNIQUE,
  ativo          BOOLEAN      NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_empresas_atualizado_em
  BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- O cadastro do Módulo 1 (nome empresa, CNPJ, nome responsável, e-mail,
-- senha) cria, na mesma transação, uma linha em "empresas" e a primeira
-- linha em "usuarios" com papel = 'administrador'.
-- E-mail é único globalmente para permitir login direto (sem escolher
-- a empresa antes).
CREATE TABLE usuarios (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id                   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome                         VARCHAR(200) NOT NULL,
  email                        VARCHAR(255) NOT NULL UNIQUE,
  senha_hash                   TEXT NOT NULL,
  papel                        papel_usuario NOT NULL DEFAULT 'atendente',
  ativo                        BOOLEAN NOT NULL DEFAULT TRUE,
  token_recuperacao_senha      TEXT,
  token_recuperacao_expira_em  TIMESTAMPTZ,
  ultimo_login_em              TIMESTAMPTZ,
  criado_em                    TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);

CREATE TRIGGER trg_usuarios_atualizado_em
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- =====================================================================
-- MÓDULO 3 / 7 — Clientes (perfil usado no Inbox e no CRM)
-- =====================================================================

CREATE TABLE clientes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome           VARCHAR(200) NOT NULL,
  telefone       VARCHAR(20)  NOT NULL,
  email          VARCHAR(255),
  observacoes    TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, telefone)
);

CREATE INDEX idx_clientes_empresa    ON clientes(empresa_id);
CREATE INDEX idx_clientes_nome_trgm  ON clientes USING gin (nome gin_trgm_ops);

CREATE TRIGGER trg_clientes_atualizado_em
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Tags do perfil do cliente (ex.: "Unimed", "VIP", "Cliente há 2 anos")
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        VARCHAR(80) NOT NULL,
  UNIQUE (empresa_id, nome)
);

CREATE TABLE cliente_tags (
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (cliente_id, tag_id)
);

-- Histórico exibido na coluna 3 do Inbox (consultas, exames, compras...)
CREATE TABLE cliente_historico (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  descricao    VARCHAR(300) NOT NULL,
  data_evento  DATE NOT NULL,
  valor        NUMERIC(12,2),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cliente_historico_cliente ON cliente_historico(cliente_id);

-- =====================================================================
-- MÓDULO 3 / 4 — Conversas e Mensagens (Inbox + WhatsApp)
-- =====================================================================

CREATE TABLE conversas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  usuario_id          UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- atendente responsável, quando houver
  categoria           categoria_conversa NOT NULL DEFAULT 'suporte',
  status              status_conversa NOT NULL DEFAULT 'ia',
  resolvida           BOOLEAN NOT NULL DEFAULT FALSE,
  ultima_mensagem_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversas_empresa_status  ON conversas(empresa_id, status);
CREATE INDEX idx_conversas_cliente         ON conversas(cliente_id);
CREATE INDEX idx_conversas_ultima_mensagem ON conversas(empresa_id, ultima_mensagem_em DESC);

CREATE TRIGGER trg_conversas_atualizado_em
  BEFORE UPDATE ON conversas
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TABLE mensagens (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id           UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  autor                 autor_mensagem NOT NULL,
  usuario_id            UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- preenchido quando autor = 'atendente'
  tipo                  tipo_mensagem NOT NULL DEFAULT 'texto',
  conteudo              TEXT NOT NULL,
  midia_url             TEXT,
  -- ID da mensagem no WhatsApp (Evolution API). Usado pra não processar o
  -- mesmo webhook duas vezes (Sprint 2).
  mensagem_externa_id   VARCHAR(120),
  enviado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensagens_conversa ON mensagens(conversa_id, enviado_em);
CREATE UNIQUE INDEX idx_mensagens_externa_id ON mensagens (mensagem_externa_id)
  WHERE mensagem_externa_id IS NOT NULL;

-- "Adicionar observação" do Módulo 3: nota interna, nunca enviada ao cliente
CREATE TABLE notas_internas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id  UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  usuario_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  conteudo     TEXT NOT NULL,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notas_internas_conversa ON notas_internas(conversa_id);

-- =====================================================================
-- MÓDULO 4 — Integração WhatsApp
-- =====================================================================

CREATE TABLE integracoes_whatsapp (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  numero_telefone  VARCHAR(20) NOT NULL,
  provedor         VARCHAR(40) NOT NULL DEFAULT 'evolution_api', -- ou 'whatsapp_business_api'
  -- Nome da instância no servidor Evolution API (usado nas rotas
  -- /message/sendText/{instancia} e pra identificar a empresa a partir do
  -- campo "instance" do payload de webhook). Único no sistema porque o
  -- Evolution API não sabe nada sobre "empresa_id".
  instancia        VARCHAR(100) UNIQUE,
  token_acesso     TEXT NOT NULL, -- apikey da instância; criptografar em repouso na camada de aplicação
  webhook_url      TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'desconectado',
  conectado_em     TIMESTAMPTZ,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- MÓDULO 5 — Agente IA
-- =====================================================================

CREATE TABLE configuracoes_ia (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id               UUID NOT NULL UNIQUE REFERENCES empresas(id) ON DELETE CASCADE,
  nome_agente              VARCHAR(80) NOT NULL DEFAULT 'Ana',
  tom                      tom_agente NOT NULL DEFAULT 'profissional',
  objetivo_vendas          BOOLEAN NOT NULL DEFAULT TRUE,
  objetivo_atendimento     BOOLEAN NOT NULL DEFAULT TRUE,
  objetivo_suporte         BOOLEAN NOT NULL DEFAULT TRUE,
  regras_transferencia     TEXT, -- quando transferir para humano
  regras_abertura_chamado  TEXT, -- quando abrir chamado
  limites_atuacao          TEXT,
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_configuracoes_ia_atualizado_em
  BEFORE UPDATE ON configuracoes_ia
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- =====================================================================
-- MÓDULO 6 — Base de Conhecimento IA (RAG)
-- =====================================================================

CREATE TABLE documentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome_arquivo  VARCHAR(300) NOT NULL,
  tipo_arquivo  VARCHAR(10) NOT NULL, -- pdf, docx, txt
  url_arquivo   TEXT NOT NULL,
  status        status_documento NOT NULL DEFAULT 'processando',
  enviado_por   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_empresa ON documentos(empresa_id);

-- Pedaços do documento após split + embedding (pgvector / Supabase Vector).
-- Ajuste a dimensão (1536) conforme o modelo de embeddings escolhido.
CREATE TABLE documento_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id  UUID NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE, -- desnormalizado p/ filtrar por tenant sem join
  ordem         INT NOT NULL,
  conteudo      TEXT NOT NULL,
  embedding     VECTOR(1536),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documento_chunks_empresa ON documento_chunks(empresa_id);
-- Índice aproximado para busca por similaridade de cosseno.
-- Construir/reconstruir depois da carga inicial de dados (o parâmetro
-- "lists" deve ser ajustado conforme o volume de linhas).
CREATE INDEX idx_documento_chunks_embedding ON documento_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =====================================================================
-- MÓDULO 7 — CRM Simples (pipeline de leads)
-- =====================================================================

CREATE TABLE leads (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id              UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_origem_id      UUID REFERENCES conversas(id) ON DELETE SET NULL,
  usuario_responsavel_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  interesse               VARCHAR(300),
  valor_estimado          NUMERIC(12,2),
  etapa                   etapa_lead NOT NULL DEFAULT 'novo_lead',
  ultimo_contato_em       TIMESTAMPTZ,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_empresa_etapa ON leads(empresa_id, etapa);
CREATE INDEX idx_leads_cliente       ON leads(cliente_id);

CREATE TRIGGER trg_leads_atualizado_em
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- =====================================================================
-- MÓDULO 8 — Sistema de Chamados (tickets)
-- =====================================================================

CREATE TABLE tickets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                  BIGSERIAL UNIQUE, -- exibido como #1042 na interface
  empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cliente_id              UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_origem_id      UUID REFERENCES conversas(id) ON DELETE SET NULL,
  usuario_responsavel_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  problema                VARCHAR(300) NOT NULL,
  descricao               TEXT,
  prioridade              prioridade_ticket NOT NULL DEFAULT 'media',
  status                  status_ticket NOT NULL DEFAULT 'aberto',
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvido_em            TIMESTAMPTZ
);

CREATE INDEX idx_tickets_empresa_status ON tickets(empresa_id, status);
CREATE INDEX idx_tickets_cliente        ON tickets(cliente_id);

CREATE TRIGGER trg_tickets_atualizado_em
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- =====================================================================
-- MÓDULO 9 — Automações
-- O fluxo visual (gatilho → condição → ação) fica em JSONB: o editor
-- front-end lê/escreve essa estrutura diretamente, sem precisar de
-- tabelas normalizadas por nó.
-- =====================================================================

CREATE TABLE automacoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id     UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome           VARCHAR(150) NOT NULL,
  gatilho        VARCHAR(100) NOT NULL, -- ex.: 'novo_lead', 'mensagem_suporte', 'cliente_parado'
  fluxo          JSONB NOT NULL,
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automacoes_empresa ON automacoes(empresa_id);

CREATE TRIGGER trg_automacoes_atualizado_em
  BEFORE UPDATE ON automacoes
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();


-- =====================================================================
-- =====================================================================
-- MÓDULO 1 — Isolamento de dados entre empresas (Row Level Security)
-- Padrão: a aplicação executa, por transação (withTenant em
-- src/config/db.js), SET LOCAL app.empresa_id = '<uuid-da-empresa>';
-- e o Postgres passa a filtrar automaticamente as linhas dessa empresa.
--
-- Cobertura completa: todas as 15 tabelas com empresa_id (direto ou via
-- tabela pai) têm RLS + FORCE. Só "empresas" fica de fora — é o próprio
-- tenant, não tem empresa_id pra filtrar contra si mesma.
--
-- FORCE ROW LEVEL SECURITY é obrigatório em todas: sem ele, a policy é
-- ignorada quando a conexão usa o role dono das tabelas (o app conecta
-- como "postgres" via DATABASE_URL, que é o dono).
--
-- Importante: RLS aqui é uma SEGUNDA camada de proteção. A camada de
-- aplicação (API) sempre filtra por empresa_id explicitamente nas
-- queries — nunca depender só do RLS.
-- =====================================================================

-- ---- Tabelas com empresa_id direto ----

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_clientes ON clientes
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_conversas ON conversas
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_tickets ON tickets
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_leads ON leads
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_documentos ON documentos
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE documento_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_documento_chunks ON documento_chunks
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE integracoes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE integracoes_whatsapp FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_integracoes_whatsapp ON integracoes_whatsapp
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE configuracoes_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_ia FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_configuracoes_ia ON configuracoes_ia
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_usuarios ON usuarios
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_tags ON tags
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automacoes FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_automacoes ON automacoes
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

-- ---- Tabelas sem empresa_id próprio — isolamento via subquery ----

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_mensagens ON mensagens
  USING (conversa_id IN (
    SELECT id FROM conversas
    WHERE empresa_id = current_setting('app.empresa_id', true)::uuid
  ));

ALTER TABLE notas_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_internas FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_notas_internas ON notas_internas
  USING (conversa_id IN (
    SELECT id FROM conversas
    WHERE empresa_id = current_setting('app.empresa_id', true)::uuid
  ));

ALTER TABLE cliente_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_tags FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_cliente_tags ON cliente_tags
  USING (cliente_id IN (
    SELECT id FROM clientes
    WHERE empresa_id = current_setting('app.empresa_id', true)::uuid
  ));

ALTER TABLE cliente_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_historico FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_cliente_historico ON cliente_historico
  USING (cliente_id IN (
    SELECT id FROM clientes
    WHERE empresa_id = current_setting('app.empresa_id', true)::uuid
  ));

COMMIT;