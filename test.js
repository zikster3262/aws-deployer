const AWS = require("aws-sdk");

const eks = new AWS.EKS({ region: "eu-central-1" });
// async function nodegroup() {
//   const nodegroup = eks
//     .describeNodegroup({
//       clusterName: "test-cluster" /* required */,
//       nodegroupName: "test-eks-nodes" /* required */,
//     })
//     .promise();
// }

// const result =
// console.log(nodegroup.nodegroup); // successful response

eks.waitFor(
  "clusterActive",
  {
    name: `${data.name}-cluster` /* required */,
  },
  function (err, data) {
    if (err) console.log(err, err.stack);
    else console.log(data); // successful response
  }
);
