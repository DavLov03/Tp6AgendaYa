const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // El frontend se sirve desde la raíz del repo (npm start), en /frontend/index.html
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
    // El módulo 5 está diseñado para escritorio (M05-R02N): viewport acorde
    viewportWidth: 1280,
    viewportHeight: 720,
    // Centra el elemento antes de interactuar, así el encabezado fijo del calendario no lo tapa
    scrollBehavior: 'center',
    video: true, // el TP pide capturas o video de la ejecución
    screenshotOnRunFailure: true,
  },
});
