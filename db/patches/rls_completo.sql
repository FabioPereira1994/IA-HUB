-- =====================================================================
-- RLS COMPLETO — AI CUSTOMER HUB
-- Consolida o isolamento multi-tenant de todas as tabelas com dado de
-- empresa. Referência para recriar uma instância do zero — NÃO editar
-- os patches 002/003/004 originais, que já foram executados e servem
-- de histórico do que rodou e quando.
--
-- Uso: depois de "npm run db:schema" e "npm run db:seed" numa instância
-- nova, rode este arquivo uma única vez:
--   psql $env:DATABASE_URL -f db/patches/rls_completo.sql
--
-- Padrão: a aplicação, por transação, executa
--   SET LOCAL app.empresa_id = '<uuid-da-empresa-logada>'
-- (feito pelo withTenant em src/config/db.js). O FORCE é obrigatório em
-- todas, porque a app conecta como "postgres" (dono das tabelas) — sem
-- FORCE, o Postgres ignora RLS pro dono por padrão.
--
-- "empresas" fica de fora de propósito: é o próprio tenant, não tem
-- empresa_id pra filtrar contra si mesma.
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

-- ---- Verificação: deve retornar só "empresas" ----
-- SELECT c.relname FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
-- ORDER BY c.relname;