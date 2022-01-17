const AWS = require("aws-sdk");
const db = require("../services/db/db");

const ec2 = new AWS.EC2({ region: "eu-central-1" });
const eks = new AWS.EKS({ region: "eu-central-1" });
const dbfindLaunchTemplate = db.findData("test-2").then((data) => {
  console.log(data.ec2.lauchTemplateID);
});

const result = ec2.deleteRouteTable(
  {
    RouteTableId: "rtb-0d6f45f54c2389131",
  },
  function (err, data) {
    if (err) console.log(err, err.stack);
    // an error occurred
    else console.log(data); // successful response
  }
);
