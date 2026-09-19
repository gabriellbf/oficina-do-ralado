/**
 * Montagem da aplicacao Express.
 *
 * Exportamos uma FUNCAO (criarApp) em vez de um app pronto para que os testes
 * consigam criar varias instancias independentes, cada uma com seu proprio
 * banco de dados e seu proprio contador de tentativas de login.
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');

const { abrirBanco } = require('./db');
const rotasPublicas = require('./rotas/publicas');
const rotasAdmin = require('./rotas/admin');
const { criarRotasAutenticacao } = require('./rotas/autenticacao');

/** Pasta com os arquivos do site (HTML, CSS, JS, imagens). */
const PASTA_PUBLICA = path.join(__dirname, '..', 'public');

/**
 * Cria a aplicacao Express.
 * @param {object} [opcoes]
 * @param {import('better-sqlite3').Database} [opcoes.db] banco ja aberto
 * @param {boolean} [opcoes.limiteLogin] false desliga o limite de tentativas
 * @returns {import('express').Express}
 */
function criarApp(opcoes = {}) {
  const app = express();
  const producao = process.env.NODE_ENV === 'production';

  // O banco fica em app.locals para que as rotas o acessem via req.app.locals.db.
  app.locals.db = opcoes.db || abrirBanco();

  // No Render o site fica atras de um proxy; isso faz o cookie "secure" funcionar.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  /* --------------------------------------------------------------- */
  /* Seguranca: cabecalhos HTTP (helmet)                              */
  /* --------------------------------------------------------------- */
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // O site nao usa scripts de terceiros nem scripts embutidos no HTML.
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          // Liberado apenas o mapa do Google incorporado na pagina de contato.
          frameSrc: ["'self'", 'https://www.google.com'],
          // O site so conversa com a propria API.
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"]
        }
      },
      // Permite que o iframe do Google Maps seja carregado.
      crossOriginEmbedderPolicy: false
    })
  );

  /* --------------------------------------------------------------- */
  /* Leitura do corpo das requisicoes                                 */
  /* --------------------------------------------------------------- */
  // Limite pequeno: o painel so envia formularios curtos.
  app.use(express.json({ limit: '64kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));

  /* --------------------------------------------------------------- */
  /* Sessao do painel administrativo                                  */
  /* --------------------------------------------------------------- */
  app.use(
    session({
      name: 'oficina.sid',
      secret: process.env.SESSION_SECRET || 'segredo-de-desenvolvimento-trocar-no-env',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true, // o JavaScript da pagina nao consegue ler o cookie
        sameSite: 'lax', // protege contra CSRF vindo de outros sites
        secure: producao, // em producao (HTTPS) o cookie so viaja criptografado
        maxAge: 1000 * 60 * 60 * 8 // 8 horas
      }
    })
  );

  /* --------------------------------------------------------------- */
  /* Protecao das PAGINAS do painel                                   */
  /* --------------------------------------------------------------- */
  // Quem tentar abrir /admin sem estar logado e mandado para a tela de login.
  app.use('/admin', (req, res, next) => {
    const ehPaginaDeLogin = req.path.startsWith('/login');
    const ehArquivoDeApoio = /\.(css|js|svg|png|jpg|ico|webmanifest)$/i.test(req.path);
    if (ehPaginaDeLogin || ehArquivoDeApoio) return next();

    if (req.session && req.session.usuarioId) return next();
    return res.redirect('/admin/login.html');
  });

  /* --------------------------------------------------------------- */
  /* Arquivos estaticos do site                                       */
  /* --------------------------------------------------------------- */
  app.use(
    express.static(PASTA_PUBLICA, {
      extensions: ['html'],
      // Cache curto em desenvolvimento, uma hora em producao (desempenho).
      maxAge: producao ? '1h' : 0
    })
  );

  /* --------------------------------------------------------------- */
  /* API                                                              */
  /* --------------------------------------------------------------- */
  app.use('/api', rotasPublicas);
  app.use('/api', criarRotasAutenticacao({ limiteLogin: opcoes.limiteLogin }));
  app.use('/api/admin', rotasAdmin);

  // Qualquer outro endereco /api/... nao existe.
  app.use('/api', (req, res) => {
    res.status(404).json({ erro: 'Endereço não encontrado na API.' });
  });

  /* --------------------------------------------------------------- */
  /* Tratamento de erros                                              */
  /* --------------------------------------------------------------- */
  // JSON mal formado enviado pelo navegador cai aqui como erro de sintaxe.
  app.use((erro, req, res, proximo) => {
    if (erro && erro.type === 'entity.parse.failed') {
      return res.status(400).json({ erro: 'Os dados enviados estão em formato inválido.' });
    }
    console.error('Erro inesperado:', erro);
    return res.status(500).json({ erro: 'Ocorreu um erro no servidor. Tente novamente.' });
  });

  return app;
}

module.exports = { criarApp, PASTA_PUBLICA };
