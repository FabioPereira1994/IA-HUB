const { z } = require('zod');

const registroSchema = z.object({
  nomeEmpresa: z.string().trim().min(2, 'Informe o nome da empresa'),
  cnpj: z.string().trim().min(14, 'CNPJ inválido'),
  nomeResponsavel: z.string().trim().min(2, 'Informe o nome do responsável'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  senha: z.string().min(1, 'Informe a senha'),
});

const esqueciSenhaSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
});

const redefinirSenhaSchema = z.object({
  token: z.string().min(10, 'Token inválido'),
  novaSenha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
});

module.exports = {
  registroSchema,
  loginSchema,
  esqueciSenhaSchema,
  redefinirSenhaSchema,
};
