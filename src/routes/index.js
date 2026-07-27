const { Router } = require('express');
const authRoutes = require('./auth.routes');
const empresasRoutes = require('./empresas.routes');
const dashboardRoutes = require('./dashboard.routes');
const conversasRoutes = require('./conversas.routes');
const clientesRoutes = require('./clientes.routes');
const webhooksRoutes = require('./webhooks.routes');
const documentosRoutes = require('./DocumentoRoutes'); 

const router = Router();

router.use('/auth', authRoutes);
router.use('/empresas', empresasRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/conversas', conversasRoutes);
router.use('/clientes', clientesRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/documentos', documentosRoutes);

module.exports = router;