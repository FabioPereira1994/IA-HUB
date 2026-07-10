const asyncHandler = require('../utils/asyncHandler');
const empresasService = require('../services/empresas.service');

const minhaEmpresa = asyncHandler(async (req, res) => {
  const empresa = await empresasService.buscarEmpresa(req.empresaId);
  res.json(empresa);
});

const atualizarMinhaEmpresa = asyncHandler(async (req, res) => {
  const empresa = await empresasService.atualizarEmpresa(req.empresaId, req.body);
  res.json(empresa);
});

module.exports = { minhaEmpresa, atualizarMinhaEmpresa };
