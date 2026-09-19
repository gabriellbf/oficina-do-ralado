/**
 * Rotas de login e logout do painel administrativo.
 *
 *   POST /api/login    entra no painel (cria a sessao)
 *   POST /api/logout   sai do painel (destroi a sessao)
 *   GET  /api/sessao   informa se o navegador ainda esta logado
 *
 * Seguranca aplicada aqui:
 *  - a senha e comparada com bcrypt (o banco guarda so o hash);
 *  - o login tem limite de 5 tentativas a cada 15 minutos por IP;
 *  - a mensagem de erro e generica, para nao revelar se o usuario existe.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { rateLimit } = require('express-rate-limit');
const { validarLogin } = require('../validacao');
const repositorio = require('../repositorio');

/** Quantidade maxima de tentativas de login e janela de tempo. */
const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

/**
 * Cria o conjunto de rotas de autenticacao.
 * Usamos uma funcao (e nao um Router pronto) para que cada instancia do app
 * tenha seu proprio contador de tentativas — importante nos testes.
 * @param {{limiteLogin?: boolean}} [opcoes]
 */
function criarRotasAutenticacao(opcoes = {}) {
  const rotas = express.Router();

  // Limitador de tentativas de login (protecao contra ataque de forca bruta).
  const limitador = rateLimit({
    windowMs: JANELA_MINUTOS * 60 * 1000,
    limit: MAX_TENTATIVAS,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        erro: `Muitas tentativas de login. Aguarde ${JANELA_MINUTOS} minutos e tente novamente.`
      });
    }
  });

  // Permite desligar o limitador em testes que nao estao medindo isso.
  const talvezLimitar = opcoes.limiteLogin === false ? (req, res, next) => next() : limitador;

  rotas.post('/login', talvezLimitar, async (req, res) => {
    const resultado = validarLogin(req.body);
    if (!resultado.valido) {
      return res.status(400).json({ erro: resultado.erro });
    }

    const { usuario, senha } = resultado.dados;
    const registro = repositorio.buscarUsuario(req.app.locals.db, usuario);

    // Mesmo quando o usuario nao existe, comparamos com um hash falso para
    // que a resposta demore o mesmo tempo (evita descobrir usuarios validos).
    const hash = registro ? registro.senha_hash : '$2b$10$invalidoinvalidoinvalidoinvalidoinvalidoinvalidoinvalidoinv';
    const senhaConfere = await bcrypt.compare(senha, hash);

    if (!registro || !senhaConfere) {
      return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    }

    // Recria o id da sessao apos o login (protecao contra session fixation).
    return req.session.regenerate((erro) => {
      if (erro) {
        return res.status(500).json({ erro: 'Não foi possível iniciar a sessão. Tente de novo.' });
      }
      req.session.usuarioId = registro.id;
      req.session.usuarioNome = registro.usuario;
      return res.json({ ok: true, usuario: registro.usuario });
    });
  });

  rotas.post('/logout', (req, res) => {
    if (!req.session) {
      return res.json({ ok: true });
    }
    return req.session.destroy(() => {
      res.clearCookie('oficina.sid');
      res.json({ ok: true });
    });
  });

  // Usado pelas paginas do painel para saber se devem redirecionar ao login.
  rotas.get('/sessao', (req, res) => {
    const logado = Boolean(req.session && req.session.usuarioId);
    res.json({ autenticado: logado, usuario: logado ? req.session.usuarioNome : null });
  });

  return rotas;
}

module.exports = { criarRotasAutenticacao, MAX_TENTATIVAS, JANELA_MINUTOS };
