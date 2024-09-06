const swaggerUI = require("swagger-ui-express");
const YAML = require('yamljs');
const path = require("path");

function setupSwagger(app) {
  // Load the swagger.yaml file
  const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

  // Setup the Swagger UI
  app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(swaggerDocument));
}

module.exports = setupSwagger;
