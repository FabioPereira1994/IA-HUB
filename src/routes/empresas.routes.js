const { Router } = require('express');
const { autenticar, permitir } = require('../middleware/auth');
const validate = require('../middleware/validate');
const controller = require('../controllers/empresas.controller');
const { atualizarEmpresaSchema } = require('../validators/empresas.validators');

const router = Router();

router.use(autenticar);
router.get('/me', controller.minhaEmpresa);
router.patch('/me', permitir('administrador'), validate(atualizarEmpresaSchema), controller.atualizarMinhaEmpresa);

module.exports = router;
