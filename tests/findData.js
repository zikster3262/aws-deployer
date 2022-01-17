const AWS = require("aws-sdk");
const db = require("../services/db/db");

const ec2 = new AWS.EC2({ region: "eu-central-1" });
const eks = new AWS.EKS({ region: "eu-central-1" });

eks.waitFor(
  "clusterDeleted",
  {
    name: "test-cluster",
  },
  function (err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  }
);
