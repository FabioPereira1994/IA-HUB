const { verificarToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Token não informado'));
  }

  const token = header.slice(7);
  try {
    const payload = verificarToken(token);
    req.usuario = { id: payload.sub, papel: payload.papel, empresaId: payload.empresaId, nome: payload.nome };
    req.empresaId = payload.empresaId;
    return next();
  } catch (err) {
    return next(new ApiError(401, 'Token inválido ou expirado'));
  }
}

// Uso: router.patch('/rota', autenticar, permitir('administrador'), controller)
function permitir(...papeis) {
  return (req, res, next) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      return next(new ApiError(403, 'Sem permissão para esta ação'));
    }
    return next();
  };
}

module.exports = { autenticar, permitir };
