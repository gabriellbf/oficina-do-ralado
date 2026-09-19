/**
 * Rotas publicas da API — usadas pelas paginas do site (nao exigem login).
 *
 *   GET /api/empresa    dados cadastrais (endereco, horario, WhatsApp...)
 *   GET /api/servicos   servicos ativos
 *   GET /api/produtos   produtos ativos, com filtro por categoria e busca
 */

const express = require('express');
const { empresa, linkWhatsapp } = require('../../config/empresa');
const { CATEGORIAS } = require('../db');
const repositorio = require('../repositorio');

const rotas = express.Router();

// Dados da empresa: o site monta rodape, horario e botoes do WhatsApp com isso.
rotas.get('/empresa', (req, res) => {
  res.json({ ...empresa, linkWhatsapp: linkWhatsapp() });
});

// Lista de servicos ativos. valor = null significa "Sob consulta".
rotas.get('/servicos', (req, res) => {
  res.json(repositorio.listarServicosPublicos(req.app.locals.db));
});

// Catalogo de produtos ativos, com filtros opcionais ?categoria= e ?busca=
rotas.get('/produtos', (req, res) => {
  const categoriaBruta = typeof req.query.categoria === 'string' ? req.query.categoria.trim().toLowerCase() : '';
  const buscaBruta = typeof req.query.busca === 'string' ? req.query.busca.trim() : '';

  // "todos" (ou vazio) significa sem filtro de categoria.
  if (categoriaBruta && categoriaBruta !== 'todos' && !CATEGORIAS.includes(categoriaBruta)) {
    return res.status(400).json({ erro: `Categoria inválida. Use uma destas: ${CATEGORIAS.join(', ')}.` });
  }

  const produtos = repositorio.listarProdutosPublicos(req.app.locals.db, {
    categoria: categoriaBruta && categoriaBruta !== 'todos' ? categoriaBruta : null,
    // Limita o tamanho da busca para evitar consultas absurdas.
    busca: buscaBruta ? buscaBruta.slice(0, 60) : null
  });

  return res.json(produtos);
});

// Lista de categorias, usada pelos botoes de filtro do catalogo e pelo painel.
rotas.get('/categorias', (req, res) => {
  res.json(CATEGORIAS);
});

module.exports = rotas;
