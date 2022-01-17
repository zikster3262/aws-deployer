require("dotenv").config();
const AWS = require("aws-sdk");
const config = require("./config/region");
const logger = require("./utils/logger");
const db = require("./services/db/db");
const express = require("express");
const port = process.env.PORT || 8080;
const app = express();
const path = require("path");
const deployment = require("./services/aws/create");
const deleteDeployment = require("./services/aws/delete");

// Run express
app.listen(port);
logger.log.info("Server started at http://localhost:" + port);
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);

app.post("/create", function (req, res) {
  db.findData(req.body.data.name).then((response) => {
    if (response != "") {
      logger.log.info(`Deployment ${req.body.data.name} already exists.`);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify({ deploymentExists: true }));
    } else {
      logger.log.info(`Creating deployment ${req.body.data.name}.`);
      deployment.createDeployment(req.body.data);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify({ deploymentExists: false }));
    }
  });
});

app.get("/get-deployments", function (req, res) {
  db.findAllQuery().then((result) => {
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify({ data: result }));
  });
});

app.post("/delete", function (req, res) {
  console.log(req.body);
  db.findData(req.body.name).then((response) => {
    if (response != "") {
      logger.log.info(`Deployment ${req.body.name} does exists.`);
      deleteDeployment.deleteDeployment(response);
      logger.log.info(`Starting to delete ${req.body.name} deployment`);
    } else {
      logger.log.error(`Deployment ${req.body.name} does not exists.`);
    }
  });
});
