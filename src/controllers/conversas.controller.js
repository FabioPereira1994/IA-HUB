const asyncHandler = require('../utils/asyncHandler');
const conversasService = require('../services/conversas.service');

const listar = asyncHandler(async (req, res) => {
  const { categoria, status, busca } = req.query;
  const conversas = await conversasService.listarConversas(req.empresaId, { categoria, status, busca });
  res.json(conversas);
});

const detalhe = asyncHandler(async (req, res) => {
  const conversa = await conversasService.buscarDetalhe(req.empresaId, req.params.id);
  res.json(conversa);
});

const enviarMensagem = asyncHandler(async (req, res) => {
  const mensagem = await conversasService.enviarMensagemHumano(req.empresaId, req.params.id, req.usuario.id, req.body.texto);
  res.status(201).json(mensagem);
});

const transferir = asyncHandler(async (req, res) => {
  const resultado = await conversasService.transferirParaHumano(req.empresaId, req.params.id, req.usuario);
  res.json(resultado);
});

const encerrar = asyncHandler(async (req, res) => {
  const resultado = await conversasService.encerrarAtendimento(req.empresaId, req.params.id, req.usuario);
  res.json(resultado);
});

const adicionarNota = asyncHandler(async (req, res) => {
  const nota = await conversasService.adicionarNota(req.empresaId, req.params.id, req.usuario.id, req.body.texto);
  res.status(201).json(nota);
});

module.exports = { listar, detalhe, enviarMensagem, transferir, encerrar, adicionarNota };
