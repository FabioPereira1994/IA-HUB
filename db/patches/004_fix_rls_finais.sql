-- Últimas 2 tabelas com dado de tenant sem RLS: automacoes (fluxos de
-- automação por empresa) e cliente_historico (histórico de compras/
-- atendimentos do cliente, sem empresa_id próprio).

ALTER TABLE automacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automacoes FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_automacoes ON automacoes
  USING (empresa_id = current_setting('app.empresa_id', true)::uuid);

ALTER TABLE cliente_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente_historico FORCE ROW LEVEL SECURITY;
CREATE POLICY isolamento_cliente_historico ON cliente_historico
  USING (cliente_id IN (
    SELECT id FROM clientes
    WHERE empresa_id = current_setting('app.empresa_id', true)::uuid
  ));