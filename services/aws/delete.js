const AWS = require("aws-sdk");
const eksClass = require("../aws/service/eks");
const db = require("../db/db");
const gw = require("./service/gws");
const table = require("./service/rt");
const logger = require("../../utils/logger");
const sg = require("./service/sg");
const VPC = require("./service/vpc");
const Subnet = require("./service/subnets");

async function deleteDeployment(data) {
  const ec2 = new AWS.EC2({ region: data.region });
  const eks = new AWS.EKS({ region: data.region });

  try {
    // // ------------------------- Delete EKS  NodeGroup ---------------------------------//

    const deleteEksNodes = await eksClass.deleteNodeGroup(data);
    const natgw = await gw.deleteNatgateway(data);

    // const eip = await gw.deleteEip(data);
    // // ------------------------- Delete Launch Template ---------------------------------//

    const ltmp = await eksClass.deleteLaunchTemplate(
      data,
      data.ec2.lauchTemplateID
    );

    eks.waitFor(
      "nodegroupDeleted",
      {
        clusterName: `${data.name}-cluster` /* required */,
        nodegroupName: `${data.name}-eks-nodes` /* required */,
      },
      function (err, result) {
        if (err) console.log(err, err.stack);
        // an error occurred
        const deleteEksControlPlane = eksClass.deleteEks(data);

        // // ------------------------- Delete EKS Control Plane ---------------------------------//
        eks.waitFor(
          "clusterDeleted",
          {
            name: `${data.name}-cluster`,
          },
          function (err, result) {
            if (err) {
              console.log(err, err.stack);
            } else {
              const eksNodesSG = sg.deleteSG(
                data,
                data.eks.eksControlPlaneSecurityGroup
              );
            }
          }
        );
      }
    );

    // // ------------------------- Delete Security Groups Rules ---------------------------------//

    const revokeHttpsControlplaneAccess = await sg.deleteSecurityRules(
      data,
      443,
      443,
      "tcp",
      data.eks.eksControlPlaneSecurityGroup,
      data.eks.eksNodesSecurityGroup
    );

    const revokeHttpsWorkerAccess = await sg.deleteSecurityRules(
      data,
      443,
      443,
      "tcp",
      data.eks.eksNodesSecurityGroup,
      data.eks.eksControlPlaneSecurityGroup
    );

    const revokeAllWorkerAcces = await sg.deleteSecurityRules(
      data,
      0,
      65545,
      "-1",
      data.eks.eksNodesSecurityGroup,
      data.eks.eksNodesSecurityGroup
    );

    const revokeCommunicationWorkerAccess = await sg.deleteSecurityRules(
      data,
      1025,
      65535,
      "-1",
      data.eks.eksNodesSecurityGroup,
      data.eks.eksControlPlaneSecurityGroup
    );

    const deleteHealthEndpointWorkerAccess = await sg.deleteSecurityRules(
      data,
      10250,
      10250,
      "tcp",
      data.eks.eksNodesSecurityGroup,
      data.eks.eksControlPlaneSecurityGroup
    );

    const deletePrivate1SubnetAccess = await sg.deleteDestinationSecurityRules(
      data,
      0,
      65535,
      "-1",
      data.eks.eksControlPlaneSecurityGroup,
      data.subnets.privateSubnet1Cidr
    );

    const deletePrivate2SubnetAccess = await sg.deleteDestinationSecurityRules(
      data,
      0,
      65535,
      "-1",
      data.eks.eksControlPlaneSecurityGroup,
      data.subnets.privateSubnet2Cidr
    );

    // ------------------------- Delete Routes ---------------------------------//
    const deletePrivateRoute = await table.deleteRoute(
      data,
      "0.0.0.0/0",
      data.routesTables.privateRouteTable
    );

    const deletePublicRoute = await table.deleteRoute(
      data,
      "0.0.0.0/0",
      data.routesTables.publicRouteTable
    );

    const deleteInfraRoute = await table.deleteRoute(
      data,
      "0.0.0.0/0",
      data.routesTables.infraRouteTable
    );
    // ------------------------- Delete Route Associacion---------------------------------//

    const deletePrivateAs1 = await table.deleteRouteTableAssociation(
      data,
      data.routesTables.routeTableAssociation.private1
    );
    const deletePrivateAs2 = await table.deleteRouteTableAssociation(
      data,
      data.routesTables.routeTableAssociation.private2
    );
    const deletePublicAs1 = await table.deleteRouteTableAssociation(
      data,
      data.routesTables.routeTableAssociation.public1
    );
    const deletePublicAs2 = await table.deleteRouteTableAssociation(
      data,
      data.routesTables.routeTableAssociation.public2
    );
    const deleteInfraAs = await table.deleteRouteTableAssociation(
      data,
      data.routesTables.routeTableAssociation.infra
    );

    // ------------------------- Delete Route Tables ---------------------------------//
    const publicRouteTable = await table.deleteRouteTable(
      data,
      data.routesTables.publicRouteTable
    );
    const PrivateRouteTable = await table.deleteRouteTable(
      data,
      data.routesTables.privateRouteTable
    );
    const infraRouteTable = await table.deleteRouteTable(
      data,
      data.routesTables.infraRouteTable
    );

    // // ------------------------- Delete Security Groups ---------------------------------//

    const eksSG = await sg.deleteSG(data, data.eks.eksNodesSecurityGroup);

    setTimeout(() => {
      // ------------------------- Delete Gateways ---------------------------------//

      const itgw = gw.deleteInternetGateway(data, data.vpc.vpcID);
      // ------------------------- Delete Subnets ---------------------------------//

      const deletePrivate1 = Subnet.deleteSubnet(
        data,
        data.subnets.privateSubnet1Id
      );
      const deletePrivate2 = Subnet.deleteSubnet(
        data,
        data.subnets.privateSubnet2Id
      );
      const deletePublic1 = Subnet.deleteSubnet(
        data,
        data.subnets.publicSubnet1Id
      );
      const deletePublic2 = Subnet.deleteSubnet(
        data,
        data.subnets.publicSubnet2Id
      );
      const deleteInfra = Subnet.deleteSubnet(data, data.subnets.infraSubnetId);

      // ------------------------- Delete VPC ---------------------------------//

      const vpc = VPC.deleteDeploymentVpc(data, data.vpc.vpcID);
    }, 6 * 60 * 1000);

    // ------------------------- Delete Data from DB ---------------------------------//
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
