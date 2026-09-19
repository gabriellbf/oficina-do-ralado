/**
 * Funcoes de apoio usadas pelos testes automatizados.
 *
 * Cada suite de teste cria seu proprio banco EM MEMORIA (':memory:'), assim os
 * testes nunca encostam no banco real de desenvolvimento (data/oficina.db) e
 * nao interferem uns nos outros.
 */

const { abrirBanco } = require('../src/db');
const { semear } = require('../src/seed');
const { criarApp } = require('../src/app');

/** Credenciais do administrador usadas nos testes. */
const USUARIO_TESTE = 'admin';
const SENHA_TESTE = 'Senha@Teste123';

/**
 * Cria um banco em memoria populado com o seed e a aplicacao Express.
 * @param {{limiteLogin?: boolean}} [opcoes]
 * @returns {{db: import('better-sqlite3').Database, app: import('express').Express}}
 */
function criarAmbiente(opcoes = {}) {
  const db = abrirBanco(':memory:');
  semear(db, { usuario: USUARIO_TESTE, senha: SENHA_TESTE, silencioso: true });

  // Por padrao os testes desligam o limite de tentativas de login; apenas o
  // teste que mede o limite (limite-login.test.js) o mantem ligado.
  const app = criarApp({ db, limiteLogin: opcoes.limiteLogin !== undefined ? opcoes.limiteLogin : false });
  return { db, app };
}

/**
 * Faz login e devolve um "agent" do supertest que guarda o cookie de sessao.
 * @param {import('supertest')} request modulo supertest
 * @param {import('express').Express} app
 */
async function logar(request, app) {
  const agente = request.agent(app);
  const resposta = await agente.post('/api/login').send({ usuario: USUARIO_TESTE, senha: SENHA_TESTE });
  if (resposta.status !== 200) {
    throw new Error(`Falha ao logar no teste: status ${resposta.status}`);
  }
  return agente;
}

module.exports = { criarAmbiente, logar, USUARIO_TESTE, SENHA_TESTE };
