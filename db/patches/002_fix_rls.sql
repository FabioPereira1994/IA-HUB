-- Patch: fecha o gap de RLS multi-tenant identificado na revisão de segurança.
-- 1) Aplica isolamento por empresa_id nas tabelas que já tinham a coluna
--    mas nenhuma política (integracoes_whatsapp guarda token de API em
--    texto puro — é a mais crítica das quatro).
-- 2) FORCE ROW LEVEL SECURITY em todas: sem isso, a policy é ignorada
--    quando a conexão usa o role dono das tabelas (o que acontece hoje,
--    já que a app conecta como "postgres").

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

-- Força RLS também nas 4 tabelas que já tinham policy, pelo mesmo motivo do owner bypass
ALTER TABLE clientes FORCE ROW LEVEL SECURITY;
ALTER TABLE conversas FORCE ROW LEVEL SECURITY;
ALTER TABLE tickets FORCE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;