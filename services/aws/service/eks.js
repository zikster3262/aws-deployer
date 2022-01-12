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
    logger.log.info(
      `Cluster: ${data.name}-cluster was created! ID - ${eksCluster.cluster.arn}`
    );
    return eksCluster;
  } catch (error) {
    logger.log.error(
      `Error: Cluster: ${data.name}-cluster was  not created! There was an error. Please see the error bellow:\n${error}`
    );
  }
}

async function createLaunchTemplate(data, sgId) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const ltmp = await ec2
      .createLaunchTemplate({
        LaunchTemplateData: {
          InstanceType: "m5.large",
          BlockDeviceMappings: [
            {
              DeviceName: "/dev/xvda",
              Ebs: {
                DeleteOnTermination: true,
                Encrypted: true,
                VolumeSize: "30",
                VolumeType: "gp2",
              },
            },
            /* more items */
          ],
          SecurityGroupIds: [sgId],
        },
        LaunchTemplateName: `${data.name}-eks-template`,
      })
      .promise();
    logger.log.info(
      `Launch template ${data.name}-eks-template was created! ID - ${ltmp.LaunchTemplate.LaunchTemplateId}`
    );
    return ltmp;
  } catch (error) {
    logger.log.error(
      `Error: Launch template ${data.name}-eks-template was  not created! There was an error. Please see the error bellow:\n${error}`
    );
  }
}

async function createNodeGroup(data, sub1, sub2, ltmp) {
  const eks = new AWS.EKS({ region: data.region });
  try {
    const eksNodes = await eks
      .createNodegroup({
        clusterName: `${data.name}-cluster` /* required */,
        nodeRole:
          "arn:aws:iam::735968160530:role/AWS-Nodes-Role" /* required */,
        nodegroupName: `${data.name}-eks-nodes` /* required */,
        subnets: [sub1, sub2],
        labels: {
          "cluster-name": `${data.name}-cluster`,
        },
        scalingConfig: {
          desiredSize: "2",
          maxSize: "2",
          minSize: "1",
        },
        tags: {
          "cluster-name": `${data.name}-cluster`,
          [`kubernetes.io/cluster/${data.name}-cluster`]: "owned",
        },
        launchTemplate: {
          id: ltmp.LaunchTemplate.LaunchTemplateId,
          version: `${ltmp.LaunchTemplate.LatestVersionNumber}`,
        },
      })
      .promise();
    logger.log.info(`EKS Node Group ${data.name} was created!`);
    return eksNodes;
  } catch (error) {
    logger.log.error(
      `Error: EKS Node Group ${data.name} was  not created! There was an error. Please see the error bellow:\n${error}`
    );
  }
}

module.exports = {
  createEKS,
  createLaunchTemplate,
  createNodeGroup,
};
