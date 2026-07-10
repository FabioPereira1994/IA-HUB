const asyncHandler = require('../utils/asyncHandler');
const dashboardService = require('../services/dashboard.service');

const obterDashboard = asyncHandler(async (req, res) => {
  const dados = await dashboardService.obterDashboard(req.empresaId, req.query.range);
  res.json(dados);
});

module.exports = { obterDashboard };
