const { Router } = require('express');
const { autenticar } = require('../middleware/auth');
const controller = require('../controllers/clientes.controller');

const router = Router();

router.use(autenticar);
router.get('/:id', controller.detalhe);

module.exports = router;
