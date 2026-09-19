/**
 * Testes de seguranca.
 *
 * Aqui simulamos o que um atacante tentaria fazer e conferimos que o sistema
 * se comporta como o esperado:
 *   - SQL Injection: o texto malicioso vira DADO, nunca comando SQL;
 *   - XSS: o texto perigoso e guardado como texto e devolvido sem execucao;
 *   - cabecalhos de seguranca do helmet estao presentes;
 *   - o servidor nao entrega informacoes desnecessarias (x-powered-by).
 */

const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { criarAmbiente, logar } = require('./ajuda');

let db;
let app;
let agente;

beforeEach(async () => {
  ({ db, app } = criarAmbiente());
  agente = await logar(request, app);
});

afterEach(() => {
  db.close();
});

/* ==================================================================== */
/* SQL Injection                                                        */
/* ==================================================================== */

describe('Tentativas de SQL Injection', () => {
  test('nome de produto com comando SQL e guardado como texto comum', async () => {
    const nomePerigoso = "Bateria'); DROP TABLE produto; --";

    const criacao = await agente
      .post('/api/admin/produtos')
      .send({ nome: nomePerigoso, categoria: 'bateria', preco: 100 });

    expect(criacao.status).toBe(201);
    // O texto voltou identico: foi tratado como dado, nao como comando.
    expect(criacao.body.nome).toBe(nomePerigoso);

    // E o mais importante: a tabela continua existindo e com os dados.
    const tabelaExiste = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='produto'")
      .get();
    expect(tabelaExiste).toBeDefined();
    expect(db.prepare('SELECT COUNT(*) AS total FROM produto').get().total).toBe(7);
  });

  test('busca com aspas e "OR 1=1" nao devolve itens escondidos', async () => {
    db.prepare('UPDATE produto SET ativo = 0 WHERE id = 1').run();

    const resposta = await request(app).get("/api/produtos?busca=' OR 1=1 --");

    expect(resposta.status).toBe(200);
    // Nenhum produto tem esse texto no nome, entao a lista volta vazia.
    expect(resposta.body).toHaveLength(0);
  });

  test('id com SQL na URL responde 400 e nao apaga nada', async () => {
    const antes = db.prepare('SELECT COUNT(*) AS total FROM produto').get().total;

    const resposta = await agente.delete('/api/admin/produtos/1 OR 1=1');

    expect(resposta.status).toBe(400);
    expect(db.prepare('SELECT COUNT(*) AS total FROM produto').get().total).toBe(antes);
  });

  test('login com SQL Injection no usuario nao entra', async () => {
    const resposta = await request(app)
      .post('/api/login')
      .send({ usuario: "admin' OR '1'='1", senha: 'qualquer' });

    expect(resposta.status).toBe(401);
  });
});

/* ==================================================================== */
/* XSS                                                                  */
/* ==================================================================== */

describe('Tentativas de XSS (script no nome do produto)', () => {
  const scriptMalicioso = '<script>alert("invadido")</script>';

  test('o texto e guardado exatamente como foi digitado, sem execucao', async () => {
    const criacao = await agente
      .post('/api/admin/produtos')
      .send({ nome: scriptMalicioso, categoria: 'outro', preco: 10 });

    expect(criacao.status).toBe(201);
    expect(criacao.body.nome).toBe(scriptMalicioso);

    // A API devolve JSON: o navegador nunca interpreta isso como HTML.
    const publico = await request(app).get('/api/produtos');
    const salvo = publico.body.find((p) => p.nome === scriptMalicioso);

    expect(salvo).toBeDefined();
    expect(resposta_eh_json(publico)).toBe(true);
  });

  test('o front-end tem a funcao que escapa HTML antes de mostrar na tela', () => {
    // Conferimos que o codigo do site realmente usa escaparHtml nos cartoes.
    const catalogo = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'catalogo.js'), 'utf8');
    const comum = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'comum.js'), 'utf8');
    const painel = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin', 'painel.js'), 'utf8');

    expect(comum).toContain('function escaparHtml');
    expect(catalogo).toContain('escaparHtml(produto.nome)');
    expect(painel).toContain('escaparHtml(produto.nome)');
  });

  test('a funcao escaparHtml do site converte os caracteres perigosos', () => {
    // Reproduzimos a mesma funcao usada no navegador para testar o resultado.
    const escaparHtml = (valor) =>
      String(valor)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    expect(escaparHtml(scriptMalicioso)).toBe('&lt;script&gt;alert(&quot;invadido&quot;)&lt;/script&gt;');
    expect(escaparHtml(scriptMalicioso)).not.toContain('<script>');
  });

  test('nome com aspas e sinais nao quebra a listagem do painel', async () => {
    await agente
      .post('/api/admin/produtos')
      .send({ nome: 'Pneu "aro 15" <novo> & usado', categoria: 'pneu', preco: 300 });

    const lista = await agente.get('/api/admin/produtos');

    expect(lista.status).toBe(200);
    expect(lista.body.map((p) => p.nome)).toContain('Pneu "aro 15" <novo> & usado');
  });
});

/** Confere se a resposta veio como JSON (e nao como HTML). */
function resposta_eh_json(resposta) {
  return String(resposta.headers['content-type']).includes('application/json');
}

/* ==================================================================== */
/* Cabecalhos de seguranca (helmet)                                     */
/* ==================================================================== */

describe('Cabecalhos de seguranca', () => {
  test('a pagina inicial vem com os cabecalhos do helmet', async () => {
    const resposta = await request(app).get('/');

    expect(resposta.headers['content-security-policy']).toBeDefined();
    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
    expect(resposta.headers['x-frame-options']).toBeDefined();
    expect(resposta.headers['referrer-policy']).toBeDefined();
  });

  test('a politica de conteudo (CSP) so libera scripts do proprio site', async () => {
    const resposta = await request(app).get('/');
    const csp = resposta.headers['content-security-policy'];

    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    // O mapa do Google e a unica origem externa liberada.
    expect(csp).toContain('https://www.google.com');
  });

  test('o servidor nao revela que usa Express (x-powered-by)', async () => {
    const resposta = await request(app).get('/');

    expect(resposta.headers['x-powered-by']).toBeUndefined();
  });
});

/* ==================================================================== */
/* Outras protecoes                                                     */
/* ==================================================================== */

describe('Outras protecoes de entrada', () => {
  test('JSON malformado responde 400 com mensagem em portugues', async () => {
    const resposta = await agente
      .post('/api/admin/produtos')
      .set('Content-Type', 'application/json')
      .send('{"nome": "quebrado"');

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Os dados enviados estão em formato inválido.');
  });

  test('corpo gigante e recusado (limite de 64kb)', async () => {
    const resposta = await agente
      .post('/api/admin/produtos')
      .send({ nome: 'Teste', categoria: 'outro', preco: 1, descricao: 'a'.repeat(100000) });

    // 413 = corpo grande demais. O importante e nao aceitar (status >= 400).
    expect(resposta.status).toBeGreaterThanOrEqual(400);
  });

  test('campos extras enviados pelo navegador sao ignorados', async () => {
    const resposta = await agente.post('/api/admin/produtos').send({
      nome: 'Produto com campo extra',
      categoria: 'outro',
      preco: 10,
      id: 999, // tentativa de escolher o id
      atualizado_em: 'data falsa'
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.id).not.toBe(999);
    expect(resposta.body.atualizado_em).not.toBe('data falsa');
  });
});
