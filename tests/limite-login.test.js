/**
 * Teste do limite de tentativas de login (protecao contra forca bruta).
 *
 * Este teste fica num arquivo separado porque e o unico que liga o limitador
 * (`limiteLogin: true`). Cada arquivo de teste do Jest roda isolado, entao o
 * contador comeca zerado aqui.
 */

const request = require('supertest');
const { criarAmbiente, USUARIO_TESTE, SENHA_TESTE } = require('./ajuda');
const { MAX_TENTATIVAS } = require('../src/rotas/autenticacao');

let db;
let app;

beforeEach(() => {
  ({ db, app } = criarAmbiente({ limiteLogin: true }));
});

afterEach(() => {
  db.close();
});

describe('Limite de tentativas de login', () => {
  test(`bloqueia com 429 depois de ${MAX_TENTATIVAS} tentativas erradas`, async () => {
    const respostas = [];

    // As 5 primeiras tentativas erradas devem responder 401.
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
      respostas.push(await request(app).post('/api/login').send({ usuario: USUARIO_TESTE, senha: 'errada' }));
    }

    expect(respostas.every((r) => r.status === 401)).toBe(true);

    // A sexta tentativa e barrada pelo limitador.
    const bloqueada = await request(app).post('/api/login').send({ usuario: USUARIO_TESTE, senha: 'errada' });

    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body.erro).toMatch(/Muitas tentativas de login/i);
  });

  test('depois de bloqueado, nem a senha CERTA entra (o bloqueio e por IP)', async () => {
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
      await request(app).post('/api/login').send({ usuario: USUARIO_TESTE, senha: 'errada' });
    }

    const comSenhaCerta = await request(app)
      .post('/api/login')
      .send({ usuario: USUARIO_TESTE, senha: SENHA_TESTE });

    expect(comSenhaCerta.status).toBe(429);
  });

  test('o limitador vale so para o login: o site publico continua aberto', async () => {
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS + 3; tentativa += 1) {
      await request(app).post('/api/login').send({ usuario: USUARIO_TESTE, senha: 'errada' });
    }

    const produtos = await request(app).get('/api/produtos');

    expect(produtos.status).toBe(200);
    expect(produtos.body).toHaveLength(6);
  });
});
