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
          endpointPrivateAccess: true,
          endpointPublicAccess: true,
          publicAccessCidrs: ["0.0.0.0/0"],
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
    logger.log.error(error);
  }
}

async function createLaunchTemplate(data, sgId) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const ltmp = await ec2
      .createLaunchTemplate({
        LaunchTemplateData: {
          InstanceType: "m5.large",
          KeyName: "david-test",
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
          TagSpecifications: [
            {
              ResourceType: "instance",
              Tags: [
                {
                  Key: `kubernetes.io/cluster/${data.name}-cluster`,
                  Value: "owned",
                },
              ],
            },
          ],
          SecurityGroupIds: [sgId],
        },
        LaunchTemplateName: `${data.name}-eks-template`,
        TagSpecifications: [
          {
            ResourceType: "launch-template",
            Tags: [
              {
                Key: `kubernetes.io/cluster/${data.name}-cluster`,
                Value: "owned",
              },
              /* more items */
            ],
          },
        ],
      })
      .promise();
    logger.log.info(
      `Launch template ${data.name}-eks-template was created! ID - ${ltmp.LaunchTemplate.LaunchTemplateId}`
    );
    return ltmp;
  } catch (error) {
    logger.log.error(error);
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
    logger.log.error(error);
  }
}

async function describeCluster(data) {
  const eks = new AWS.EKS({ region: data.region });
  try {
    const config = await eks
      .describeCluster({
        name: `${data.name}-cluster`,
      })
      .promise();
    logger.log.info(`Reading ${data.name}-cluster Cluster information!`);
    return config;
  } catch (error) {
    logger.log.error(error);
  }
}

async function describeNodeGroup(data) {
  try {
    const result = await eks
      .describeNodegroup({
        clusterName: `${data.name}-cluster` /* required */,
        nodegroupName: `${data.name}-eks-nodes` /* required */,
      })
      .promise();
    logger.log.info(
      `Reading ${data.name}-eks-nodes for ${data.name}-cluster information!`
    );
    return result;
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteNodeGroup(data) {
  const eks = new AWS.EKS({ region: data.region });
  try {
    const nodeDelete = await eks
      .deleteNodegroup({
        clusterName: `${data.name}-cluster` /* required */,
        nodegroupName: `${data.name}-eks-nodes` /* required */,
      })
      .promise();

    logger.log.info(
      `Deleting ${data.name}-eks-nodes for ${data.name}-cluster was deleted!`
    );
    return nodeDelete;
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteEks(data) {
  const eks = new AWS.EKS({ region: data.region });
  try {
    const deleteEks = await eks
      .deleteCluster({
        name: `${data.name}-cluster` /* required */,
      })
      .promise();
    logger.log.info(`Cluster ${data.name}-cluster is being deleted!`);
    return deleteEks;
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteLaunchTemplate(data, id) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const result = await ec2
      .deleteLaunchTemplate({
        LaunchTemplateId: id,
      })
      .promise();
    logger.log.info(`Launch Template ${data.name}-eks-template was deleted!`);
    return result;
  } catch (error) {
    logger.log.error(error);
  }
}

module.exports = {
  createEKS,
  createLaunchTemplate,
  createNodeGroup,
  describeCluster,
  describeNodeGroup,
  deleteNodeGroup,
  deleteEks,
  deleteLaunchTemplate,
};
