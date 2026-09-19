/**
 * Testes da API publica (a que o site usa sem precisar de login).
 */

const request = require('supertest');
const { criarAmbiente } = require('./ajuda');

let db;
let app;

beforeEach(() => {
  ({ db, app } = criarAmbiente());
});

afterEach(() => {
  db.close();
});

describe('GET /api/empresa', () => {
  test('devolve os dados cadastrais da oficina', async () => {
    const resposta = await request(app).get('/api/empresa');

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Oficina do Ralado');
    expect(resposta.body.cnpj).toBe('22.072.206/0001-60');
    expect(resposta.body.telefone.whatsapp).toBe('5531999825481');
    expect(resposta.body.linkWhatsapp).toContain('https://wa.me/5531999825481?text=');
    expect(Array.isArray(resposta.body.horario)).toBe(true);
    expect(resposta.body.formasPagamento).toContain('PIX');
  });
});

describe('GET /api/produtos', () => {
  test('devolve os produtos do seed', async () => {
    const resposta = await request(app).get('/api/produtos');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(6);
    expect(resposta.body[0]).toHaveProperty('preco');
  });

  test('NAO devolve produtos ocultos (ativo = 0)', async () => {
    db.prepare('UPDATE produto SET ativo = 0 WHERE nome = ?').run('Bateria 45Ah');

    const resposta = await request(app).get('/api/produtos');
    const nomes = resposta.body.map((p) => p.nome);

    expect(resposta.body).toHaveLength(5);
    expect(nomes).not.toContain('Bateria 45Ah');
  });

  test('filtra por categoria', async () => {
    const resposta = await request(app).get('/api/produtos?categoria=bateria');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
    expect(resposta.body.every((p) => p.categoria === 'bateria')).toBe(true);
  });

  test('categoria "todos" devolve a lista completa', async () => {
    const resposta = await request(app).get('/api/produtos?categoria=todos');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(6);
  });

  test('categoria inexistente responde 400 com mensagem em portugues', async () => {
    const resposta = await request(app).get('/api/produtos?categoria=motor');

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/Categoria inválida/);
  });

  test('busca por parte do nome, sem diferenciar maiusculas', async () => {
    const resposta = await request(app).get('/api/produtos?busca=PNEU');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
    expect(resposta.body.every((p) => p.nome.toLowerCase().includes('pneu'))).toBe(true);
  });

  test('combina categoria e busca', async () => {
    const resposta = await request(app).get('/api/produtos?categoria=bateria&busca=60');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(1);
    expect(resposta.body[0].nome).toBe('Bateria 60Ah');
  });
});

describe('GET /api/servicos', () => {
  test('devolve os servicos do seed', async () => {
    const resposta = await request(app).get('/api/servicos');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(5);
  });

  test('NAO devolve servicos ocultos (ativo = 0)', async () => {
    db.prepare('UPDATE servico SET ativo = 0 WHERE tipo = ?').run('Troca de pneu');

    const resposta = await request(app).get('/api/servicos');
    const tipos = resposta.body.map((s) => s.tipo);

    expect(resposta.body).toHaveLength(4);
    expect(tipos).not.toContain('Troca de pneu');
  });

  test('servico sem valor volta como null (o site mostra "Sob consulta")', async () => {
    const resposta = await request(app).get('/api/servicos');
    const semValor = resposta.body.find((s) => s.tipo === 'Troca e teste de bateria');

    expect(semValor.valor).toBeNull();
  });
});

describe('GET /api/categorias', () => {
  test('devolve as quatro categorias aceitas', async () => {
    const resposta = await request(app).get('/api/categorias');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual(['bateria', 'pneu', 'lampada', 'outro']);
  });
});

describe('Endereco inexistente na API', () => {
  test('responde 404 em JSON', async () => {
    const resposta = await request(app).get('/api/nao-existe');

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toBeDefined();
  });
});
