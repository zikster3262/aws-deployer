const AWS = require("aws-sdk");
const logger = require("../../../utils/logger");

async function createRouteTable(data, prefix, VpcId) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const routeTable = await ec2
      .createRouteTable({
        VpcId: VpcId,
        TagSpecifications: [
          {
            ResourceType: "route-table",
            Tags: [
              {
                Key: "Name",
                Value: `${prefix}-${data.name}`,
              },
            ],
          },
        ],
      })
      .promise();
    logger.log.info(`RT ${prefix}-${data.name} was created!`);
    return routeTable;
  } catch (error) {
    logger.log.error(
      `Error: Route Table ${data.name} was  not created! There was an error. Please see the error bellow:\n ${error}`
    );
  }
}

async function createRouteTableAssociation(data, rtId, subnetId) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const rta = await ec2
      .associateRouteTable({
        RouteTableId: rtId,
        SubnetId: subnetId,
      })
      .promise();
    return rta;
  } catch (error) {
    logger.log.error(
      `Error: Route Table Association for ${data.name} was  not created! There was an error. Please see the error bellow:\n ${error}`
    );
  }
}

async function createItgwRoutes(data, dest, itgw, rtId) {
  const ec2 = new AWS.EC2({ region: data.region });
  try {
    const route = await ec2
      .createRoute({
        DestinationCidrBlock: dest,
        GatewayId: itgw,
        RouteTableId: rtId,
      })
      .promise();
    return route;
  } catch (error) {
    logger.log.error(
      `Error: Route itgw ${data.name} was  not created! There was an error. Please see the error bellow:\n ${error}`
    );
  }
}

async function createNatGwRoutes(data, dest, natgw, rtId) {
  const ec2 = await new AWS.EC2({ region: data.region });
  try {
    const route = await ec2
      .createRoute({
        DestinationCidrBlock: dest,
        NatGatewayId: natgw,
        RouteTableId: rtId,
      })
      .promise();
    return route;
  } catch (error) {
    logger.log.error(
      `Error: Route natgw ${data.name} was  not created! There was an error. Please see the error bellow:\n ${error}`
    );
  }
}

module.exports = {
  createRouteTable,
  createRouteTableAssociation,
  createItgwRoutes,
  createNatGwRoutes,
};
