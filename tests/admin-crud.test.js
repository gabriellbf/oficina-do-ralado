/**
 * Testes do CRUD do painel administrativo (produtos e servicos),
 * incluindo as validacoes que devem responder 400.
 */

const request = require('supertest');
const { criarAmbiente, logar } = require('./ajuda');

let db;
let app;
let agente; // supertest ja logado (guarda o cookie de sessao)

beforeEach(async () => {
  ({ db, app } = criarAmbiente());
  agente = await logar(request, app);
});

afterEach(() => {
  db.close();
});

/* ==================================================================== */
/* PRODUTOS                                                             */
/* ==================================================================== */

describe('CRUD de produtos', () => {
  test('LISTAR traz tambem os produtos escondidos', async () => {
    db.prepare('UPDATE produto SET ativo = 0 WHERE nome = ?').run('Pneu aro 13');

    const publico = await request(app).get('/api/produtos');
    const painel = await agente.get('/api/admin/produtos');

    expect(publico.body).toHaveLength(5);
    expect(painel.body).toHaveLength(6);
    expect(painel.body.some((p) => p.ativo === 0)).toBe(true);
  });

  test('CRIAR um produto novo responde 201 e ele aparece no site', async () => {
    const criacao = await agente.post('/api/admin/produtos').send({
      nome: 'Bateria 70Ah',
      descricao: 'Bateria para caminhonetes.',
      categoria: 'bateria',
      preco: 699.9
    });

    expect(criacao.status).toBe(201);
    expect(criacao.body.id).toBeDefined();
    expect(criacao.body.nome).toBe('Bateria 70Ah');
    expect(criacao.body.ativo).toBe(1);

    const publico = await request(app).get('/api/produtos?categoria=bateria');
    expect(publico.body.map((p) => p.nome)).toContain('Bateria 70Ah');
  });

  test('ALTERAR o preco salva o valor novo', async () => {
    const alteracao = await agente.put('/api/admin/produtos/1').send({
      nome: 'Bateria 45Ah',
      descricao: 'Bateria automotiva 45Ah.',
      categoria: 'bateria',
      preco: '429,90', // com virgula, como o dono digita no celular
      ativo: 1
    });

    expect(alteracao.status).toBe(200);
    expect(alteracao.body.preco).toBe(429.9);

    const publico = await request(app).get('/api/produtos?busca=45Ah');
    expect(publico.body[0].preco).toBe(429.9);
  });

  test('ESCONDER (ativo = 0) tira o produto do site mas mantem no painel', async () => {
    await agente.put('/api/admin/produtos/1').send({
      nome: 'Bateria 45Ah',
      categoria: 'bateria',
      preco: 389.9,
      ativo: 0
    });

    const publico = await request(app).get('/api/produtos');
    const painel = await agente.get('/api/admin/produtos');

    expect(publico.body.map((p) => p.id)).not.toContain(1);
    expect(painel.body.find((p) => p.id === 1).ativo).toBe(0);
  });

  test('EXCLUIR remove o produto do banco', async () => {
    const exclusao = await agente.delete('/api/admin/produtos/1');

    expect(exclusao.status).toBe(200);
    expect(exclusao.body.ok).toBe(true);
    expect(db.prepare('SELECT id FROM produto WHERE id = 1').get()).toBeUndefined();
  });

  test('alterar ou excluir um id que nao existe responde 404', async () => {
    const alteracao = await agente
      .put('/api/admin/produtos/9999')
      .send({ nome: 'X', categoria: 'outro', preco: 1 });
    const exclusao = await agente.delete('/api/admin/produtos/9999');

    expect(alteracao.status).toBe(404);
    expect(exclusao.status).toBe(404);
    expect(exclusao.body.erro).toBe('Produto não encontrado.');
  });

  test('id invalido na URL responde 400', async () => {
    const resposta = await agente.delete('/api/admin/produtos/abc');

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Identificador inválido.');
  });
});

describe('Validacoes de produto (devem responder 400)', () => {
  const casos = [
    ['nome vazio', { nome: '   ', categoria: 'bateria', preco: 10 }, /nome do produto é obrigatório/i],
    ['nome ausente', { categoria: 'bateria', preco: 10 }, /nome do produto é obrigatório/i],
    [
      'nome com mais de 100 caracteres',
      { nome: 'A'.repeat(101), categoria: 'bateria', preco: 10 },
      /no máximo 100 caracteres/i
    ],
    ['preco negativo', { nome: 'Teste', categoria: 'bateria', preco: -5 }, /não pode ser negativo/i],
    ['preco ausente', { nome: 'Teste', categoria: 'bateria' }, /preço é obrigatório/i],
    ['preco que nao e numero', { nome: 'Teste', categoria: 'bateria', preco: 'caro' }, /preço é obrigatório/i],
    ['categoria invalida', { nome: 'Teste', categoria: 'motor', preco: 10 }, /categoria deve ser uma destas/i],
    ['categoria ausente', { nome: 'Teste', preco: 10 }, /categoria deve ser uma destas/i]
  ];

  test.each(casos)('POST com %s responde 400', async (rotulo, corpo, mensagemEsperada) => {
    const resposta = await agente.post('/api/admin/produtos').send(corpo);

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(mensagemEsperada);
  });

  test.each(casos)('PUT com %s responde 400', async (rotulo, corpo) => {
    const resposta = await agente.put('/api/admin/produtos/1').send(corpo);

    expect(resposta.status).toBe(400);
  });

  test('preco invalido nao altera o que ja estava salvo', async () => {
    const antes = db.prepare('SELECT preco FROM produto WHERE id = 1').get().preco;

    await agente.put('/api/admin/produtos/1').send({ nome: 'Bateria 45Ah', categoria: 'bateria', preco: -1 });

    expect(db.prepare('SELECT preco FROM produto WHERE id = 1').get().preco).toBe(antes);
  });

  test('preco zero e aceito (item de cortesia)', async () => {
    const resposta = await agente
      .post('/api/admin/produtos')
      .send({ nome: 'Brinde', categoria: 'outro', preco: 0 });

    expect(resposta.status).toBe(201);
    expect(resposta.body.preco).toBe(0);
  });
});

/* ==================================================================== */
/* SERVICOS                                                             */
/* ==================================================================== */

describe('CRUD de servicos', () => {
  test('CRIAR um servico novo responde 201', async () => {
    const resposta = await agente.post('/api/admin/servicos').send({
      tipo: 'Alinhamento simples',
      descricao: 'Ajuste da geometria das rodas dianteiras.',
      valor: 80
    });

    expect(resposta.status).toBe(201);
    expect(resposta.body.tipo).toBe('Alinhamento simples');
    expect(resposta.body.valor).toBe(80);
  });

  test('CRIAR servico sem valor grava null (o site mostra "Sob consulta")', async () => {
    const resposta = await agente.post('/api/admin/servicos').send({ tipo: 'Serviço especial', valor: '' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.valor).toBeNull();
  });

  test('ALTERAR o valor de um servico funciona', async () => {
    const resposta = await agente.put('/api/admin/servicos/1').send({
      tipo: 'Conserto de pneu furado',
      valor: '45,00',
      ativo: 1
    });

    expect(resposta.status).toBe(200);
    expect(resposta.body.valor).toBe(45);
  });

  test('ESCONDER um servico tira ele do site', async () => {
    await agente.put('/api/admin/servicos/2').send({ tipo: 'Troca de pneu', valor: 40, ativo: 0 });

    const publico = await request(app).get('/api/servicos');
    expect(publico.body.map((s) => s.id)).not.toContain(2);
  });

  test('EXCLUIR remove o servico', async () => {
    const resposta = await agente.delete('/api/admin/servicos/2');

    expect(resposta.status).toBe(200);
    expect(db.prepare('SELECT id FROM servico WHERE id = 2').get()).toBeUndefined();
  });

  test('servico que nao existe responde 404', async () => {
    const resposta = await agente.put('/api/admin/servicos/9999').send({ tipo: 'X', valor: 1 });

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toBe('Serviço não encontrado.');
  });
});

describe('Validacoes de servico (devem responder 400)', () => {
  test('nome do servico vazio responde 400', async () => {
    const resposta = await agente.post('/api/admin/servicos').send({ tipo: '  ', valor: 10 });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/nome do serviço é obrigatório/i);
  });

  test('valor negativo responde 400', async () => {
    const resposta = await agente.post('/api/admin/servicos').send({ tipo: 'Teste', valor: -10 });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/não pode ser negativo/i);
  });

  test('valor que nao e numero responde 400', async () => {
    const resposta = await agente.post('/api/admin/servicos').send({ tipo: 'Teste', valor: 'barato' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/deve ser um número/i);
  });

  test('descricao com mais de 500 caracteres responde 400', async () => {
    const resposta = await agente
      .post('/api/admin/servicos')
      .send({ tipo: 'Teste', descricao: 'a'.repeat(501), valor: 10 });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/no máximo 500 caracteres/i);
  });
});
