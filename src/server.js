/**
 * Ponto de entrada do servidor (npm start).
 *
 * 1. le as variaveis do arquivo .env;
 * 2. abre o banco de dados;
 * 3. se o banco estiver vazio, roda o seed automaticamente — isso e
 *    necessario porque a hospedagem gratuita apaga o disco a cada deploy;
 * 4. sobe o site na porta configurada.
 */

require('dotenv').config({ quiet: true });

const { criarApp } = require('./app');
const { abrirBanco, bancoVazio, caminhoPadrao } = require('./db');
const { semear } = require('./seed');

const PORTA = Number(process.env.PORT) || 3000;

const db = abrirBanco();

// Hospedagem gratuita apaga o disco a cada deploy: se o banco voltou vazio,
// recriamos os dados de exemplo e o usuario administrador automaticamente.
if (bancoVazio(db)) {
  console.log('Banco vazio detectado — inserindo dados de exemplo (seed automático).');
  semear(db);
}

const app = criarApp({ db });

const servidor = app.listen(PORTA, () => {
  console.log(`Oficina do Ralado no ar em http://localhost:${PORTA}`);
  console.log(`Painel administrativo: http://localhost:${PORTA}/admin/login.html`);
  console.log(`Banco de dados: ${caminhoPadrao()}`);
});

/** Encerra o banco com elegancia quando o servidor e desligado (Ctrl+C / Render). */
function encerrar() {
  console.log('Encerrando o servidor...');
  servidor.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', encerrar);
process.on('SIGTERM', encerrar);

module.exports = { app, servidor };
