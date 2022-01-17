const AWS = require("aws-sdk");
const logger = require("../../../utils/logger");

async function createSubnet(data, name, cidr_block, VpcId, zone, tag) {
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
                Key: `${tag != "" ? tag : name}`,
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
    logger.log.info(
      `Subnet ${data.name}-${name}-cluster was  created! ID - ${subnet.Subnet.SubnetId}`
    );
    return subnet;
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteSubnet(data, id) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const subnet = await ec2
      .deleteSubnet({
        SubnetId: id,
      })
      .promise();
    logger.log.info(`Subnet ${id} was deleted.`);
  } catch (error) {
    logger.log.error(error);
  }
}

module.exports = {
  createSubnet,
  deleteSubnet,
};
