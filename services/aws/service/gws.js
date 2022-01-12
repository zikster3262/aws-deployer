const AWS = require("aws-sdk");
const logger = require("../../../utils/logger");

async function createNatGW(data, subnetId) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const eip = await ec2
      .allocateAddress({
        TagSpecifications: [
          {
            ResourceType: "elastic-ip",
            Tags: [
              {
                Key: "Name",
                Value: `eip-${data.name}`,
              },
            ],
          },
        ],
      })
      .promise();
    // Create NatGW
    const natgw = await ec2
      .createNatGateway({
        AllocationId: eip.AllocationId,
        SubnetId: subnetId,
        TagSpecifications: [
          {
            ResourceType: "natgateway",
            Tags: [
              {
                Key: "Name",
                Value: `natgw-${data.name}`,
              },
            ],
          },
        ],
      })
      .promise();

    logger.log.info(`natgw-${data.name} was created!`);
    return natgw;
  } catch (error) {
    logger.log.error(
      `Error: natgw-${data.name} was  not created! There was an error. Please see the error bellow:\n${error}`
    );
  }
}

async function createItgw(data, VpcId) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const itgw = await ec2
      .createInternetGateway({
        TagSpecifications: [
          {
            ResourceType: "internet-gateway",
            Tags: [
              {
                Key: "Name",
                Value: `itgw-${data.name}`,
              },
            ],
          },
        ],
      })
      .promise();
    const internetGatewayAttachment = await ec2
      .attachInternetGateway({
        InternetGatewayId: itgw.InternetGateway.InternetGatewayId,
        VpcId: VpcId,
      })
      .promise();
    logger.log.info(`itgw-${data.name} was created!`);
    return itgw;
  } catch (error) {
    logger.log.error(
      `Error: itgw-${data.name} was  not created! There was an error. Please see the error bellow:\n${error}`
    );
  }
}

module.exports = {
  createNatGW,
  createItgw,
};
