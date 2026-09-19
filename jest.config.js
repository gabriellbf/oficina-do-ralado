/** Configuracao do Jest (testes automatizados com Jest + Supertest). */
module.exports = {
  testEnvironment: 'node',
  // Os testes de ponta a ponta com Playwright ficam fora do Jest.
  testPathIgnorePatterns: ['/node_modules/', '/scripts/'],
  collectCoverageFrom: ['src/**/*.js', 'config/**/*.js'],
  coverageReporters: ['text', 'lcov'],
  // Evita que uma conexao aberta trave o processo no fim da suite.
  forceExit: false
};
