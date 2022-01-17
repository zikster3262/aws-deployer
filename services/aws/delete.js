const AWS = require("aws-sdk");
const eksClass = require("../aws/service/eks");
const db = require("../db/db");
const gw = require("./service/gws");
const table = require("./service/rt");
const logger = require("../../utils/logger");
const sg = require("./service/sg");
const VPC = require("./service/vpc");

async function deleteDeployment(data) {
  const ec2 = new AWS.EC2({ region: data.region });
  const eks = new AWS.EKS({ region: data.region });

  console.log(data);
  try {
    // // ------------------------- Delete EKS  NodeGroup ---------------------------------//
    const deleteEksNodes = await eksClass.deleteNodeGroup(data);

    // // ------------------------- Delete Launch Template ---------------------------------//

    const ltmp = await eksClass.deleteLaunchTemplate(
      data,
      data.ec2.lauchTemplateID
    );
    // // ------------------------- Delete EKS Control Plane ---------------------------------//
    const deleteEksControlPlane = await eksClass.deleteEks(data);
    const eksSG = await sg.deleteSG(data, data.ec2.eksSG);
    const eksNodesSG = await sg.deleteSG(data, data.ec2.eksNodesSG);

    // const natgw = await gw.deleteNatgateway(data);
    // const itgw = await gw.deleteInternetGateway(data, data.vpc.vpcID);
    // // ------------------------- Delete Security Groups ---------------------------------//

    // // ------------------------- Delete Route Tables ---------------------------------//
    // const publicRouteTable = await table.deleteRouteTable(
    //   data,
    //   data.routesTables.publicRouteTable
    // );
    // const PrivateRouteTable = await table.deleteRouteTable(
    //   data,
    //   data.routesTables.privateRouteTable
    // );
    // const infraRouteTable = await table.deleteRouteTable(
    //   data,
    //   data.routesTables.infraRouteTable
    // );

    // const vpc = await VPC.deleteDeploymentVpc(data, data.vpc.vpcID);

    // db.deleteData(data._id);
    // logger.log.info(`Deployment ${data.name} was deleted from the database.`);
  } catch (error) {
    logger.log.error(
      `Deployment ${data.name} was  not deleted! There was an error. Please see the error bellow: \n ${error}`
    );
  }
}

module.exports = {
  deleteDeployment,
};
