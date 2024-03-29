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
    logger.log.info(
      `RT ${prefix}-${data.name} was created! ID - ${routeTable.RouteTable.RouteTableId}`
    );
    return routeTable;
  } catch (error) {
    logger.log.error(error);
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
    logger.log.info(`Route Table Association for ${data.name} was created!`);
    return rta;
  } catch (error) {
    logger.log.error(error);
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
    logger.log.info(
      `Create Ingress Route for ITGW for ${data.name} was created!`
    );
    return route;
  } catch (error) {
    logger.log.error(error);
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
    logger.log.info(
      `Create Ingress Route for NATGW for ${data.name} was created.`
    );
    return route;
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteRouteTable(data, routeTableId) {
  const ec2 = await new AWS.EC2({ region: data.region });
  try {
    const result = await ec2
      .deleteRouteTable({
        RouteTableId: routeTableId,
      })
      .promise();
    logger.log.info(`Route Table ${routeTableId} was deleted.`);
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteRoute(data, cidrBlock, routeTableId) {
  const ec2 = await new AWS.EC2({ region: data.region });
  try {
    const route = await ec2.deleteRoute({
      DestinationCidrBlock: cidrBlock,
      RouteTableId: routeTableId,
    }).promise;
    logger.log.info(`Route ${routeTableId} was deleted.`);
    return route;
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteRouteTableAssociation(data, id) {
  const ec2 = await new AWS.EC2({ region: data.region });
  try {
    const rta = await ec2
      .disassociateRouteTable({
        AssociationId: id,
      })
      .promise();
    logger.log.info(`Route Table Associacion ${id} was deleted.`);
  } catch (error) {
    logger.log.error(error);
  }
}

module.exports = {
  createRouteTable,
  createRouteTableAssociation,
  createItgwRoutes,
  createNatGwRoutes,
  deleteRouteTable,
  deleteRoute,
  deleteRouteTableAssociation,
};
