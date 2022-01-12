const AWS = require("aws-sdk");
const logger = require("../../../utils/logger");

async function createEKS(data, defaultSG, sub1, sub2) {
  logger.log.info(`Cluster: ${data.name}-cluster is being created.`);
  const eks = new AWS.EKS({ region: data.region });
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const eksCluster = await eks
      .createCluster({
        version: "1.21",
        name: `${data.name}-cluster`,
        resourcesVpcConfig: {
          securityGroupIds: [defaultSG],
          subnetIds: [sub1, sub2],
          endpointPublicAccess: true,
          publicAccessCidrs: ["78.102.216.207/32"],
        },
        roleArn: "arn:aws:iam::735968160530:role/Management-EKS",
        tags: {
          "cluster-name": `${data.name}-cluster`,
          [`kubernetes.io/cluster/${data.name}-cluster`]: "owned",
        },
      })
      .promise();
    logger.log.info(`Cluster: ${data.name}-cluster was created!`);
    return eksCluster;
  } catch (error) {
    logger.log.error(
      `Error: Cluster: ${data.name}-cluster was  not created! There was an error. Please see the error bellow:\n${error}`
    );
  }
}

module.exports = {
  createEKS,
};
