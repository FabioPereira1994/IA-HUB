const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { autenticar } = require('../middleware/auth');
const controller = require('../controllers/auth.controller');
const {
  registroSchema,
  loginSchema,
  esqueciSenhaSchema,
  redefinirSenhaSchema,
} = require('../validators/auth.validators');

const router = Router();

// Limita tentativas de login pra dificultar força bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

router.post('/registro', validate(registroSchema), controller.registrar);
router.post('/login', loginLimiter, validate(loginSchema), controller.login);
router.post('/esqueci-senha', validate(esqueciSenhaSchema), controller.esqueciSenha);
router.post('/redefinir-senha', validate(redefinirSenhaSchema), controller.redefinirSenha);
router.get('/me', autenticar, controller.me);

module.exports = router;
