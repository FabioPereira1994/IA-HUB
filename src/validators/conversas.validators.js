const { z } = require('zod');

const enviarMensagemSchema = z.object({
  texto: z.string().trim().min(1, 'Mensagem não pode ser vazia').max(4096, 'Mensagem muito longa'),
});

const adicionarNotaSchema = z.object({
  texto: z.string().trim().min(1, 'Nota não pode ser vazia').max(2000, 'Nota muito longa'),
});

module.exports = { enviarMensagemSchema, adicionarNotaSchema };
