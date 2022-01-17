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

    logger.log.info(
      `natgw-${data.name} was created! ID - ${natgw.NatGateway.NatGatewayId}`
    );
    return { natgw, eip };
  } catch (error) {
    logger.log.error(error);
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
    logger.log.info(
      `Create itgw-${data.name} was created! ID - ${itgw.InternetGateway.InternetGatewayId}`
    );
    return itgw;
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteNatgateway(data) {
  try {
    const ec2 = new AWS.EC2({ region: data.region });
    const natgw = await ec2
      .deleteNatGateway({
        NatGatewayId: data.gateway.natgw,
      })
      .promise();

    logger.log.info(
      `NATGW natgw-${data.name} was deleted ID - ${data.gateway.natgw} was deleted`
    );
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteEip(data) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    // const discassociateEip = await ec2
    //   .disassociateAddress({
    //     AssociationId: data.gateway.allocationId,
    //   })
    //   .promise();
    const deleteEip = await ec2
      .releaseAddress({
        // PublicIp: data.gateway.publicIP,
        AllocationId: data.gateway.allocationId,
      })
      .promise();
    logger.log.info("Elastic IP was deleted");
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteInternetGateway(data, vpcID) {
  try {
    const ec2 = new AWS.EC2({ region: data.region });
    const detach = await ec2
      .detachInternetGateway({
        InternetGatewayId: data.gateway.intgwId /* required */,
        VpcId: vpcID,
      })
      .promise();
    const result = await ec2
      .deleteInternetGateway({
        InternetGatewayId: data.gateway.intgwId,
      })
      .promise();
    logger.log.info(
      `INTGW itgw-${data.name} was detached and deleted ID - ${data.gateway.intgwId}`
    );
    return { detach, result };
  } catch (error) {
    logger.log.error(error);
  }
}

module.exports = {
  createNatGW,
  createItgw,
  deleteNatgateway,
  deleteInternetGateway,
  deleteEip,
};
