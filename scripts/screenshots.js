/**
 * scripts/screenshots.js — gera as evidencias visuais do projeto (npm run screenshots).
 *
 * O que ele faz, na ordem:
 *   1. apaga e recria um banco de dados SO PARA AS FOTOS (nao mexe no banco
 *      de desenvolvimento);
 *   2. sobe o servidor numa porta separada (3210);
 *   3. abre o navegador Chromium com o Playwright;
 *   4. fotografa as telas do site e do painel;
 *   5. salva tudo em docs/prints/ e desliga o servidor.
 *
 * Se o Chromium ainda nao estiver instalado, rode antes:
 *     npx playwright install chromium
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

/* --------------------------------------------------------------------- */
/* Configuracao                                                           */
/* --------------------------------------------------------------------- */

const PORTA = 3210;
const ENDERECO = `http://localhost:${PORTA}`;
const RAIZ = path.join(__dirname, '..');
const PASTA_PRINTS = path.join(RAIZ, 'docs', 'prints');
const BANCO_PRINTS = path.join(RAIZ, 'data', 'screenshots.db');

// Usuario/senha usados apenas nestas fotos (banco descartavel).
const ADMIN_USER = 'admin';
const ADMIN_PASSWORD = 'SenhaDasFotos@2025';

/** Tamanhos de tela usados nas fotos. */
const TELA_COMPUTADOR = { width: 1366, height: 900 };
const TELA_CELULAR = { width: 390, height: 844 };

/* --------------------------------------------------------------------- */
/* Funcoes de apoio                                                       */
/* --------------------------------------------------------------------- */

/** Espera um tempo em milissegundos. */
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Apaga o banco usado nas fotos para o seed rodar do zero. */
function limparBancoAntigo() {
  for (const sufixo of ['', '-journal', '-wal', '-shm']) {
    const arquivo = BANCO_PRINTS + sufixo;
    if (fs.existsSync(arquivo)) fs.unlinkSync(arquivo);
  }
}

/**
 * Sobe o servidor num processo separado.
 * @returns {Promise<import('child_process').ChildProcess>}
 */
async function subirServidor() {
  const processo = spawn(process.execPath, [path.join(RAIZ, 'src', 'server.js')], {
    cwd: RAIZ,
    env: {
      ...process.env,
      PORT: String(PORTA),
      DATABASE_PATH: BANCO_PRINTS,
      ADMIN_USER,
      ADMIN_PASSWORD,
      SESSION_SECRET: 'segredo-temporario-apenas-para-gerar-as-fotos',
      NODE_ENV: 'development'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  processo.stdout.on('data', (dado) => process.stdout.write(`   [servidor] ${dado}`));
  processo.stderr.on('data', (dado) => process.stderr.write(`   [servidor] ${dado}`));

  // Espera o servidor responder (tenta por ate 20 segundos).
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    try {
      const resposta = await fetch(`${ENDERECO}/api/produtos`);
      if (resposta.ok) return processo;
    } catch (erro) {
      // ainda subindo: tenta de novo
    }
    await esperar(500);
  }

  processo.kill();
  throw new Error('O servidor não respondeu a tempo.');
}

/**
 * Tira a foto e avisa no terminal.
 * @param {import('@playwright/test').Page} pagina
 * @param {string} arquivo nome do arquivo dentro de docs/prints
 * @param {{paginaInteira?: boolean}} [opcoes]
 */
async function fotografar(pagina, arquivo, opcoes = {}) {
  const destino = path.join(PASTA_PRINTS, arquivo);
  await pagina.screenshot({ path: destino, fullPage: Boolean(opcoes.paginaInteira) });
  console.log(`   ✓ ${arquivo}`);
}

/* --------------------------------------------------------------------- */
/* Roteiro das fotos                                                      */
/* --------------------------------------------------------------------- */

async function gerarFotos(navegador) {
  /* ---------- 1. Página inicial no computador ---------- */
  const contextoComputador = await navegador.newContext({ viewport: TELA_COMPUTADOR, locale: 'pt-BR' });
  const paginaComputador = await contextoComputador.newPage();

  await paginaComputador.goto(`${ENDERECO}/`, { waitUntil: 'networkidle' });
  await fotografar(paginaComputador, '01-inicio-computador-1366.png');

  /* ---------- 2. Catálogo filtrado por "bateria" ---------- */
  await paginaComputador.goto(`${ENDERECO}/catalogo.html`, { waitUntil: 'networkidle' });
  await paginaComputador.click('button[data-categoria="bateria"]');
  // Espera o filtro terminar: só devem sobrar as duas baterias.
  await paginaComputador.waitForFunction(
    () => document.querySelectorAll('#lista-produtos .cartao').length === 2
  );
  await fotografar(paginaComputador, '03-catalogo-filtro-bateria.png');

  /* ---------- 3. Página de contato ---------- */
  await paginaComputador.goto(`${ENDERECO}/contato.html`, { waitUntil: 'networkidle' });
  await esperar(1500); // dá tempo do mapa do Google aparecer
  await fotografar(paginaComputador, '04-contato.png', { paginaInteira: true });

  await contextoComputador.close();

  /* ---------- 4. Página inicial no celular ---------- */
  const contextoCelular = await navegador.newContext({
    viewport: TELA_CELULAR,
    locale: 'pt-BR',
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  const paginaCelular = await contextoCelular.newPage();

  await paginaCelular.goto(`${ENDERECO}/`, { waitUntil: 'networkidle' });
  await fotografar(paginaCelular, '02-inicio-celular-390.png');

  /* ---------- 5. Tela de login do painel ---------- */
  await paginaCelular.goto(`${ENDERECO}/admin/login.html`, { waitUntil: 'networkidle' });
  await fotografar(paginaCelular, '05-login-painel.png');

  /* ---------- 6. Painel: alterando um preço no celular ---------- */
  await paginaCelular.fill('#usuario', ADMIN_USER);
  await paginaCelular.fill('#senha', ADMIN_PASSWORD);
  await paginaCelular.click('#botao-entrar');

  await paginaCelular.waitForURL('**/admin/');
  await paginaCelular.waitForSelector('.item[data-id="1"]');

  // Simula o Sr. Renê trocando o preço da primeira bateria.
  await paginaCelular.fill('.item[data-id="1"] [data-campo-preco]', '419,90');
  await fotografar(paginaCelular, '06-painel-editar-preco-celular.png');

  // Confirma a alteração para fotografar a mensagem de sucesso.
  await paginaCelular.click('.item[data-id="1"] [data-acao="salvar-preco"]');
  await paginaCelular.waitForSelector('#recado.aviso--sucesso');
  await fotografar(paginaCelular, '07-painel-preco-salvo-celular.png');

  await contextoCelular.close();
}

/* --------------------------------------------------------------------- */
/* Execucao                                                               */
/* --------------------------------------------------------------------- */

async function principal() {
  console.log('Gerando prints do projeto Oficina do Ralado...\n');

  fs.mkdirSync(PASTA_PRINTS, { recursive: true });
  limparBancoAntigo();

  console.log('1) Subindo o servidor de testes...');
  const servidor = await subirServidor();

  let navegador;
  try {
    console.log('2) Abrindo o navegador (Chromium)...');
    navegador = await chromium.launch();

    console.log('3) Fotografando as telas:');
    await gerarFotos(navegador);

    console.log(`\nPronto! As imagens estão em docs/prints/`);
  } finally {
    if (navegador) await navegador.close();
    servidor.kill();
    // Dá um instante para o processo do servidor liberar o arquivo do banco.
    await esperar(400);
    limparBancoAntigo();
  }
}

principal().catch((erro) => {
  console.error('\nFalhou ao gerar os prints:', erro.message);
  console.error('Dica: se o erro falar do navegador, rode "npx playwright install chromium".');
  process.exit(1);
});
