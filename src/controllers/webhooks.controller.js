const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const webhookWhatsappService = require('../services/webhookWhatsapp.service');

const receberWhatsapp = asyncHandler(async (req, res) => {
  if (env.EVOLUTION_WEBHOOK_SECRET) {
    const segredoRecebido = req.headers['x-webhook-secret'];
    if (segredoRecebido !== env.EVOLUTION_WEBHOOK_SECRET) {
      throw new ApiError(401, 'Segredo do webhook inválido');
    }
  }

  const resultado = await webhookWhatsappService.receberMensagem(req.body);
  res.status(200).json(resultado);
});

module.exports = { receberWhatsapp };
