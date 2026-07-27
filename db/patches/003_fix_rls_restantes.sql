-- Fecha os últimos gaps de RLS encontrados no Table Editor do Supabase.
-- usuarios guarda senha_hash — a mais sensível das 5 tabelas aqui.

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_usuarios ON usuarios
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_tags ON tags
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

-- mensagens e notas_internas não têm empresa_id próprio — isolamento
-- via subquery na tabela conversas (que já tem RLS e empresa_id).
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

-- cliente_tags: tabela de junção sem empresa_id, isolamento via clientes.
ALTER TABLE cliente_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_tags FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_cliente_tags ON cliente_tags
  USING (cliente_id IN (
    SELECT id FROM clientes
    WHERE empresa_id = current_setting('app.empresa_id', true)::uuid
  ));