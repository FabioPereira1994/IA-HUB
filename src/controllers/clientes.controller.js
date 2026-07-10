const asyncHandler = require('../utils/asyncHandler');
const clientesService = require('../services/clientes.service');

const detalhe = asyncHandler(async (req, res) => {
  const perfil = await clientesService.buscarPerfil(req.empresaId, req.params.id);
  res.json(perfil);
});

module.exports = { detalhe };
