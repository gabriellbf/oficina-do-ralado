# Como publicar o site no Render (plano gratuito)

Este guia mostra como colocar o site da Oficina do Ralado no ar usando o **Render**
(<https://render.com>), a partir do código hospedado no **GitHub**.

O plano gratuito do Render atende bem um site desse porte e não exige cartão de crédito.

---

## 1. Antes de começar

Você vai precisar de:

- [ ] Uma conta no **GitHub** com o código do projeto enviado (repositório).
- [ ] Uma conta no **Render** (dá para criar entrando com o GitHub).
- [ ] Uma senha forte escolhida para o painel do Sr. Renê.
- [ ] Um `SESSION_SECRET` gerado. Rode no terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copie o código que aparecer — você vai colar no Render daqui a pouco.

> ⚠️ Confirme que o arquivo `.env` **não** foi enviado para o GitHub. Ele contém senhas.
> Para conferir: `git ls-files | findstr .env` — só pode aparecer `.env.example`.

---

## 2. Enviar o código para o GitHub

Se o projeto ainda não estiver no GitHub:

```bash
git remote add origin https://github.com/SEU-USUARIO/oficina-do-ralado.git
git push -u origin main
```

---

## 3. Criar o serviço no Render

1. Entre em <https://dashboard.render.com>.
2. Clique em **New +** → **Web Service**.
3. Escolha **Build and deploy from a Git repository** e clique em **Next**.
4. Conecte sua conta do GitHub e selecione o repositório `oficina-do-ralado`.
5. Preencha as configurações:

| Campo                  | Valor                                           |
| ---------------------- | ----------------------------------------------- |
| **Name**               | `oficina-do-ralado`                             |
| **Region**             | `Oregon (US West)` ou a mais próxima disponível |
| **Branch**             | `main`                                          |
| **Root Directory**     | _(deixe vazio)_                                 |
| **Runtime / Language** | `Node`                                          |
| **Build Command**      | `npm install`                                   |
| **Start Command**      | `npm start`                                     |
| **Instance Type**      | `Free`                                          |

### 3.1. A versão do Node já vem definida no projeto

Você **não precisa configurar nada** aqui — mas é importante entender o motivo, porque este ponto
já quebrou um deploy.

O banco de dados usa a biblioteca `better-sqlite3`, que é escrita em C++. Para não ter que compilar
nada na hora da instalação, ela distribui **binários já prontos**, um para cada versão do Node.
A versão 11.10.0 tem binário pronto para Node **18, 20, 22 e 23**.

Quando o Render escolhe sozinho a versão do Node, ele pega a mais nova disponível (Node 26, por
exemplo). Como não existe binário pronto para essa versão, o `npm install` tenta **compilar do
zero** com o `node-gyp` — e falha com `gyp ERR! build error`.

Para travar isso, o projeto traz na raiz o arquivo **`.node-version`** com o conteúdo `22.12.0`,
que é a mesma versão usada no desenvolvimento. O Render lê esse arquivo automaticamente. O
`package.json` também declara `"engines": { "node": ">=20 <23" }` como documentação da faixa aceita.

> ⚠️ Se alguém cadastrar uma variável de ambiente `NODE_VERSION` no Render, ela **tem prioridade**
> sobre o arquivo `.node-version` e o erro volta. Não cadastre essa variável.

---

## 4. Configurar as variáveis de ambiente

Ainda na tela de criação, abra **Advanced** → **Add Environment Variable** e cadastre:

| Key              | Value                             | Observação                                          |
| ---------------- | --------------------------------- | --------------------------------------------------- |
| `NODE_ENV`       | `production`                      | Liga o cookie seguro (HTTPS) e o cache dos arquivos |
| `SESSION_SECRET` | _(o código aleatório do passo 1)_ | **Nunca** use o valor de exemplo                    |
| `ADMIN_USER`     | `rene`                            | Usuário que o Sr. Renê vai digitar                  |
| `ADMIN_PASSWORD` | _(a senha forte escolhida)_       | Mínimo 10 caracteres. **Não escreva a senha neste arquivo** |
| `DATABASE_PATH`  | `./data/oficina.db`               | Caminho do banco                                    |

**Não** cadastre a variável `PORT`: o Render define a porta sozinho, e o código já lê esse valor
automaticamente (`process.env.PORT`).

Clique em **Create Web Service**.

---

## 5. Acompanhar o primeiro deploy

O Render vai baixar o código, rodar `npm install` e depois `npm start`.
Na aba **Logs** você deve ver algo assim:

```
Banco vazio detectado — inserindo dados de exemplo (seed automático).
Seed: 6 produtos e 5 serviços inseridos.
Seed: usuário administrador "rene" criado.
Oficina do Ralado no ar em http://localhost:10000
```

Quando o status virar **Live**, o site já está no ar no endereço mostrado no topo da página,
algo como `https://oficina-do-ralado.onrender.com`.

Teste:

- Site: `https://oficina-do-ralado.onrender.com`
- Painel: `https://oficina-do-ralado.onrender.com/admin/login.html`

---

## 6. ⚠️ Aviso importante sobre o plano gratuito

Estes dois pontos precisam ser explicados ao Sr. Renê:

### 6.1. O banco de dados é recriado a cada deploy

No plano gratuito o Render **não tem disco permanente**. Toda vez que uma nova versão do código é
publicada (ou que o serviço é reiniciado), o arquivo `data/oficina.db` é apagado.

Quando isso acontece, o servidor percebe que o banco está vazio e roda o seed automaticamente.
Resultado: **os produtos e preços voltam a ser os de exemplo**, e qualquer alteração feita pelo
Sr. Renê no painel é perdida.

Por isso o código foi escrito com o seed automático (`src/server.js`): mesmo depois de um deploy,
o site nunca fica quebrado nem vazio.

**Como resolver isso de verdade**, quando o projeto sair da fase acadêmica:

| Opção                           | Custo aproximado               | Observação                                                  |
| ------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| Render **Persistent Disk**      | plano pago                     | Mantém o arquivo `.db` entre deploys — solução mais simples |
| Banco **PostgreSQL** gerenciado | plano gratuito limitado / pago | Exige trocar o `better-sqlite3` por um driver do Postgres   |
| Outra hospedagem com disco      | varia                          | Mesma ideia do disco persistente                            |

### 6.2. O site "dorme" quando ninguém acessa

No plano gratuito, se ninguém abrir o site por cerca de 15 minutos, o Render desliga o serviço.
O próximo acesso liga tudo de novo, mas essa primeira visita pode demorar de **30 a 60 segundos**.

Depois disso o site volta a responder rápido normalmente.

---

## 7. Publicando uma alteração

Sempre que o código mudar:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

O Render detecta o `push` e publica sozinho. Lembre-se do aviso do item 6.1:
**todo deploy zera o banco no plano gratuito**.

---

## 8. Problemas comuns

| Problema                             | Causa provável                       | Solução                                                                      |
| ------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| Deploy falha em `npm install` com `gyp ERR! build error` | O Render usou um Node sem binário pronto do `better-sqlite3` | Já resolvido pelo arquivo `.node-version` (item 3.1). Confira se não existe uma variável `NODE_VERSION` no Render sobrescrevendo ele |
| Login não funciona no site publicado | `NODE_ENV=production` sem HTTPS      | O Render já fornece HTTPS; confira se está acessando com `https://`          |
| "Muitas tentativas de login"         | Limite de 5 tentativas por IP        | Espere 15 minutos                                                            |
| Preços voltaram aos de exemplo       | Houve um deploy (item 6.1)           | Esperado no plano gratuito; cadastre de novo ou contrate o disco persistente |
| O primeiro acesso do dia demora      | O serviço estava dormindo (item 6.2) | Normal no plano gratuito                                                     |
