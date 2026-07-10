const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

const registrar = asyncHandler(async (req, res) => {
  const resultado = await authService.registrar(req.body);
  res.status(201).json(resultado);
});

const login = asyncHandler(async (req, res) => {
  const resultado = await authService.login(req.body);
  res.status(200).json(resultado);
});

const esqueciSenha = asyncHandler(async (req, res) => {
  await authService.esqueciSenha(req.body);
  res.status(200).json({ mensagem: 'Se o e-mail existir, enviaremos as instruções de recuperação.' });
});

const redefinirSenha = asyncHandler(async (req, res) => {
  await authService.redefinirSenha(req.body);
  res.status(200).json({ mensagem: 'Senha redefinida com sucesso.' });
});

const me = asyncHandler(async (req, res) => {
  const perfil = await authService.buscarPerfil(req.usuario.id, req.empresaId);
  res.status(200).json(perfil);
});

module.exports = { registrar, login, esqueciSenha, redefinirSenha, me };
