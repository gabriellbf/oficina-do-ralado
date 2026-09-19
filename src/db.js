/**
 * Camada de acesso ao banco de dados (SQLite via better-sqlite3).
 *
 * O caminho do arquivo do banco vem da variavel de ambiente DATABASE_PATH
 * (padrao: ./data/oficina.db). Nos testes usamos um arquivo temporario ou
 * ':memory:', por isso a funcao recebe o caminho como parametro.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/** Categorias aceitas na tabela de produtos (usado tambem na validacao). */
const CATEGORIAS = ['bateria', 'pneu', 'lampada', 'outro'];

/**
 * Retorna o caminho do banco configurado no ambiente.
 * @returns {string}
 */
function caminhoPadrao() {
  return process.env.DATABASE_PATH || path.join('data', 'oficina.db');
}

/**
 * Cria as tabelas caso ainda nao existam.
 * @param {import('better-sqlite3').Database} db
 */
function criarTabelas(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS produto (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT    NOT NULL,
      descricao     TEXT,
      categoria     TEXT    CHECK (categoria IN ('bateria','pneu','lampada','outro')),
      preco         REAL    NOT NULL CHECK (preco >= 0),
      ativo         INTEGER NOT NULL DEFAULT 1,
      atualizado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS servico (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo          TEXT    NOT NULL,
      descricao     TEXT,
      valor         REAL    CHECK (valor IS NULL OR valor >= 0),
      ativo         INTEGER NOT NULL DEFAULT 1,
      atualizado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS usuario (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario    TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL
    );
  `);
}

/**
 * Abre (ou cria) o banco de dados e garante que as tabelas existam.
 * @param {string} [caminho] caminho do arquivo .db ou ':memory:'
 * @returns {import('better-sqlite3').Database}
 */
function abrirBanco(caminho = caminhoPadrao()) {
  // Para bancos em arquivo, garantimos que a pasta exista antes de abrir.
  if (caminho !== ':memory:') {
    const pasta = path.dirname(path.resolve(caminho));
    if (!fs.existsSync(pasta)) {
      fs.mkdirSync(pasta, { recursive: true });
    }
  }

  const db = new Database(caminho);
  // Garante que as restricoes de chave estrangeira e os CHECKs sejam aplicados.
  db.pragma('foreign_keys = ON');
  criarTabelas(db);
  return db;
}

/**
 * Indica se o banco ainda nao tem nenhum dado (usado para rodar o seed sozinho).
 * @param {import('better-sqlite3').Database} db
 * @returns {boolean}
 */
function bancoVazio(db) {
  const produtos = db.prepare('SELECT COUNT(*) AS total FROM produto').get().total;
  const servicos = db.prepare('SELECT COUNT(*) AS total FROM servico').get().total;
  const usuarios = db.prepare('SELECT COUNT(*) AS total FROM usuario').get().total;
  return produtos === 0 && servicos === 0 && usuarios === 0;
}

/** Data/hora atual no formato ISO, gravada na coluna atualizado_em. */
function agora() {
  return new Date().toISOString();
}

module.exports = { abrirBanco, criarTabelas, bancoVazio, caminhoPadrao, agora, CATEGORIAS };
