// Encapsula um handler assíncrono e encaminha qualquer erro pro
// middleware de erro central, sem precisar de try/catch em cada rota.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
