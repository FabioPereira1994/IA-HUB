const { Router } = require('express');
const { autenticar } = require('../middleware/auth');
const controller = require('../controllers/dashboard.controller');

const router = Router();

router.use(autenticar);
router.get('/', controller.obterDashboard);

module.exports = router;
