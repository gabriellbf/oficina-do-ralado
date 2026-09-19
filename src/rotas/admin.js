/**
 * Rotas do painel administrativo (todas exigem login).
 *
 *   GET    /api/admin/produtos       lista tudo (inclusive itens ocultos)
 *   POST   /api/admin/produtos       cadastra
 *   PUT    /api/admin/produtos/:id   altera
 *   DELETE /api/admin/produtos/:id   exclui
 *   ... e as mesmas quatro rotas para /api/admin/servicos
 */

const express = require('express');
const { exigirLogin } = require('../middlewares/autenticacao');
const { validarProduto, validarServico, validarId } = require('../validacao');
const repositorio = require('../repositorio');

const rotas = express.Router();

// Trava de seguranca: nada abaixo desta linha funciona sem sessao valida.
rotas.use(exigirLogin);

/** Mensagem padrao quando o id da URL nao e um numero valido. */
const ERRO_ID = { erro: 'Identificador inválido.' };

/* ------------------------------------------------------------------ */
/* Produtos                                                            */
/* ------------------------------------------------------------------ */

rotas.get('/produtos', (req, res) => {
  res.json(repositorio.listarProdutosAdmin(req.app.locals.db));
});

rotas.post('/produtos', (req, res) => {
  const resultado = validarProduto(req.body);
  if (!resultado.valido) {
    return res.status(400).json({ erro: resultado.erro });
  }
  const criado = repositorio.criarProduto(req.app.locals.db, resultado.dados);
  return res.status(201).json(criado);
});

rotas.put('/produtos/:id', (req, res) => {
  const id = validarId(req.params.id);
  if (id === null) return res.status(400).json(ERRO_ID);

  const resultado = validarProduto(req.body);
  if (!resultado.valido) {
    return res.status(400).json({ erro: resultado.erro });
  }

  const atualizado = repositorio.atualizarProduto(req.app.locals.db, id, resultado.dados);
  if (!atualizado) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }
  return res.json(atualizado);
});

rotas.delete('/produtos/:id', (req, res) => {
  const id = validarId(req.params.id);
  if (id === null) return res.status(400).json(ERRO_ID);

  const apagou = repositorio.excluirProduto(req.app.locals.db, id);
  if (!apagou) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }
  return res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Servicos                                                            */
/* ------------------------------------------------------------------ */

rotas.get('/servicos', (req, res) => {
  res.json(repositorio.listarServicosAdmin(req.app.locals.db));
});

rotas.post('/servicos', (req, res) => {
  const resultado = validarServico(req.body);
  if (!resultado.valido) {
    return res.status(400).json({ erro: resultado.erro });
  }
  const criado = repositorio.criarServico(req.app.locals.db, resultado.dados);
  return res.status(201).json(criado);
});

rotas.put('/servicos/:id', (req, res) => {
  const id = validarId(req.params.id);
  if (id === null) return res.status(400).json(ERRO_ID);

  const resultado = validarServico(req.body);
  if (!resultado.valido) {
    return res.status(400).json({ erro: resultado.erro });
  }

  const atualizado = repositorio.atualizarServico(req.app.locals.db, id, resultado.dados);
  if (!atualizado) {
    return res.status(404).json({ erro: 'Serviço não encontrado.' });
  }
  return res.json(atualizado);
});

rotas.delete('/servicos/:id', (req, res) => {
  const id = validarId(req.params.id);
  if (id === null) return res.status(400).json(ERRO_ID);

  const apagou = repositorio.excluirServico(req.app.locals.db, id);
  if (!apagou) {
    return res.status(404).json({ erro: 'Serviço não encontrado.' });
  }
  return res.json({ ok: true });
});

module.exports = rotas;
