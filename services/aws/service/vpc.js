const AWS = require("aws-sdk");
const logger = require("../../../utils/logger");

async function createVpc(data) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const response = await ec2
      .createVpc({
        CidrBlock: `${data.cidr_block}`,
        TagSpecifications: [
          {
            ResourceType: "vpc",
            Tags: [
              {
                Key: "Name",
                Value: `vpc-${data.name}`,
              },
              {
                Key: `kubernetes.io/cluster/${data.name}-cluster`,
                Value: "shared",
              },
            ],
          },
        ],
      })
      .promise();
    logger.log.info(
      `vpc-${data.name} was  created! ID - ${response.Vpc.VpcId}`
    );
    return response;
  } catch (error) {
    logger.log.error(
      `Error: VPC: vpc-${data.name} was  not created! There was an error. Please see the error bellow:\n${error}`
    );
  }
}

async function enableVpcDnsResolution(vpcID, data) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const enableDNS = ec2.modifyVpcAttribute({
      EnableDnsSupport: {
        Value: true,
      },
      EnableDnsHostnames: {
        Value: true,
      },

      VpcId: vpcID,
    });
    logger.log.info(`VpcHostnameResolution was enabled for vpc ${vpcID}`);
    return enableDNS;
  } catch (error) {
    logger.log.error(
      `VpcHostnameResolution was not enabled for vpc ${vpcID}! Error: /n ${error}`
    );
  }
}

module.exports = {
  createVpc,
  enableVpcDnsResolution,
};
