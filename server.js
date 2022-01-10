require("dotenv").config();
const AWS = require("aws-sdk");
const config = require("./config/region");
const logger = require("./utils/logger");
const db = require("./services/db/db");
const express = require("express");
const port = process.env.PORT || 8080;
const app = express();
const path = require("path");
const deployment = require("./services/aws/aws");
AWS.config.update({ region: config.region });

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
