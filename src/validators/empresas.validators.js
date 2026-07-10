const { z } = require('zod');

const atualizarEmpresaSchema = z.object({
  nome: z.string().trim().min(2, 'Informe um nome válido').optional(),
});

module.exports = { atualizarEmpresaSchema };
