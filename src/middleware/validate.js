const ApiError = require('../utils/ApiError');

// Uso: router.post('/rota', validate(algumSchemaZod), controller)
function validate(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      return next(new ApiError(400, 'Dados inválidos', resultado.error.flatten()));
    }
    req.body = resultado.data;
    return next();
  };
}

module.exports = validate;
