-- =====================================================================
-- AI CUSTOMER HUB — Dados de exemplo (seed)
-- Popula o schema com a mesma empresa/clientes usados no protótipo do
-- Dashboard + Inbox, pra testar as rotas da API com dados reais.
-- Execute depois de db/schema.sql
-- =====================================================================

BEGIN;

INSERT INTO empresas (id, nome, cnpj) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Clínica Vitalis', '12.345.678/0001-90');

-- Senha de exemplo: "senha-temporaria" (troque no primeiro login)
INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, papel) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001',
   'Fernanda Souza', 'fernanda@clinicavitalis.com.br',
   crypt('senha-temporaria', gen_salt('bf')), 'atendente');

INSERT INTO configuracoes_ia (empresa_id, nome_agente, tom) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ana', 'profissional');

INSERT INTO integracoes_whatsapp (empresa_id, numero_telefone, provedor, instancia, token_acesso, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '+55 11 90000-0000', 'evolution_api', 'clinica-vitalis', 'REDACTED', 'conectado');

INSERT INTO tags (id, empresa_id, nome) VALUES
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000001', 'Unimed'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000001', 'VIP'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000001', 'SulAmérica');

INSERT INTO clientes (id, empresa_id, nome, telefone) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Carlos Eduardo Ramos', '+5511988772201'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', 'João Pedro Lima', '+5511966228890'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', 'Maria Fernanda Souza', '+5511977114432');

INSERT INTO cliente_tags (cliente_id, tag_id) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000302'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000303'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000301');

INSERT INTO cliente_historico (cliente_id, descricao, data_evento) VALUES
  ('00000000-0000-0000-0000-000000000201', 'Consulta Cardiologia', '2026-05-12'),
  ('00000000-0000-0000-0000-000000000201', 'Exame de sangue', '2026-06-08'),
  ('00000000-0000-0000-0000-000000000202', 'Exame de sangue', '2026-06-08'),
  ('00000000-0000-0000-0000-000000000202', 'Consulta Clínico Geral', '2026-04-15');

INSERT INTO conversas (id, empresa_id, cliente_id, usuario_id, categoria, status, resolvida) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101',
   'suporte', 'humano', TRUE),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000202', NULL,
   'suporte', 'pendente', FALSE),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000203', NULL,
   'vendas', 'ia', FALSE);

INSERT INTO mensagens (conversa_id, autor, tipo, conteudo, enviado_em) VALUES
  ('00000000-0000-0000-0000-000000000401', 'cliente', 'texto', 'Oi, boa tarde. Fiz um exame de sangue semana passada e até agora não recebi o resultado.', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000000401', 'ia', 'texto', 'Boa tarde, Carlos! Vou verificar o status do seu exame agora mesmo.', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-000000000401', 'sistema', 'texto', 'Conversa transferida para Fernanda Souza (atendente)', now() - interval '2 hours 50 minutes'),
  ('00000000-0000-0000-0000-000000000401', 'atendente', 'texto', 'Oi Carlos, aqui é a Fernanda! Já abri um chamado com o laboratório.', now() - interval '2 hours 40 minutes'),
  ('00000000-0000-0000-0000-000000000402', 'cliente', 'texto', 'Meu exame ainda não chegou, pode verificar?', now() - interval '30 minutes'),
  ('00000000-0000-0000-0000-000000000402', 'ia', 'texto', 'Claro, vou consultar agora.', now() - interval '29 minutes'),
  ('00000000-0000-0000-0000-000000000403', 'cliente', 'texto', 'Quanto custa a consulta com o Dr. Ricardo?', now() - interval '10 minutes'),
  ('00000000-0000-0000-0000-000000000403', 'ia', 'texto', 'A consulta custa R$ 280 ou é coberta pelo convênio Unimed. Quer que eu verifique horários?', now() - interval '9 minutes');

INSERT INTO tickets (empresa_id, cliente_id, conversa_origem_id, problema, descricao, prioridade, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201',
   '00000000-0000-0000-0000-000000000401', 'Atraso na entrega de resultado de exame',
   'Segunda vez que o resultado atrasa; cliente pediu atendimento humano.', 'alta', 'resolvido'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202',
   '00000000-0000-0000-0000-000000000402', 'Atraso na segunda via de exame',
   'Cliente aguardando retorno sobre o exame de sangue de 08/06.', 'alta', 'em_analise');

INSERT INTO leads (empresa_id, cliente_id, conversa_origem_id, interesse, valor_estimado, etapa, ultimo_contato_em) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000203',
   '00000000-0000-0000-0000-000000000403', 'Consulta com Dr. Ricardo (Cardiologia)', 280.00, 'proposta', now());

COMMIT;
