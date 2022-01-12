const AWS = require("aws-sdk");
const logger = require("../../../utils/logger");

async function createSubnet(data, name, cidr_block, VpcId, zone) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const subnet = await ec2
      .createSubnet({
        CidrBlock: cidr_block,
        VpcId: VpcId,
        AvailabilityZone: `${data.region}${zone}`,
        TagSpecifications: [
          {
            ResourceType: "subnet",
            Tags: [
              {
                Key: "Name",
                Value: `${data.name}-${name}`,
              },
              {
                Key: "kubernetes.io/role/internal-elb",
                Value: "1",
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
    logger.log.info(`Subnet ${data.name}-${name}-cluster was  created!`);
    return subnet;
  } catch (error) {
    logger.log.error(
      `Error: Subnet: ${data.name}-${name} was  not created! There was an error. Please see the error bellow:\n${error}`
    );
  }
}

module.exports = {
  createSubnet,
};
