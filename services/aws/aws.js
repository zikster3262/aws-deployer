const AWS = require("aws-sdk");
const config = require("../../config/region");
const logger = require("../../utils/logger");
const VPC = require("./service/vpc");
const Subnet = require("./service/subnets");
const gws = require("./service/gws");
const table = require("./service/rt");
const sg = require("./service/sg");
const eksCluster = require("./service/eks");
AWS.config.update({ region: config.region });
const db = require("../db/db");
require("dotenv").config();

// Create empty deployment model object
const Model = {};

const createDeployment = async (data) => {
  console.log(data);
  try {
    const eksClusterTag = `kubernetes.io/cluster/${data.name}-eks-cluster`;
    const ec2 = new AWS.EC2({ region: data.region });
    const eks = new AWS.EKS({ region: data.region });
    // --------------------------- Creation of VPC  -------------------------------------------------------------//

    const vpc = await VPC.createVpc(data);

    // --------------------------- Creation of Subnets  -------------------------------------------------------------//
    const privateSubnet1 = await Subnet.createSubnet(
      data,
      "privateSubnet1",
      data.subnet1,
      vpc.Vpc.VpcId,
      "a"
    );

    const privateSubnet2 = await Subnet.createSubnet(
      data,
      "privateSubnet2",
      data.subnet2,
      vpc.Vpc.VpcId,
      "b"
    );

    const pubSubnet1 = await Subnet.createSubnet(
      data,
      "publicSubnet1",
      data.subnet3,
      vpc.Vpc.VpcId,
      "a"
    );
    const pubSubnet2 = await Subnet.createSubnet(
      data,
      "publicSubnet2",
      data.subnet4,
      vpc.Vpc.VpcId,
      "b"
    );

    const infraSubnet = await Subnet.createSubnet(
      data,
      "InfraSubnet",
      data.subnet5,
      vpc.Vpc.VpcId,
      "a"
    );

    // // -------------------------   Create Elastic IP and NatGW ---------------------------------------------//
    const natgw = await gws.createNatGW(data, infraSubnet.Subnet.SubnetId);
    // // -------------------------  Creation of Route Tables --------------------------------/

    const infraRouteTable = await table.createRouteTable(
      data,
      "infra",
      vpc.Vpc.VpcId
    );

    const privateRouteTable = await table.createRouteTable(
      data,
      "private",
      vpc.Vpc.VpcId
    );

    const publicRouteTable = await table.createRouteTable(
      data,
      "public",
      vpc.Vpc.VpcId
    );

    //-------------------------  Creation of Route Tables Association ------------------------//

    const rtaPublic1 = await table.createRouteTableAssociation(
      data,
      (
        await publicRouteTable
      ).RouteTable.RouteTableId,
      pubSubnet1.Subnet.SubnetId
    );

    const rtaPublic2 = await table.createRouteTableAssociation(
      data,
      (
        await publicRouteTable
      ).RouteTable.RouteTableId,
      pubSubnet2.Subnet.SubnetId
    );

    const rtaPrivate1 = await table.createRouteTableAssociation(
      data,
      (
        await privateRouteTable
      ).RouteTable.RouteTableId,
      privateSubnet1.Subnet.SubnetId
    );

    const rtaPrivate2 = await table.createRouteTableAssociation(
      data,
      (
        await privateRouteTable
      ).RouteTable.RouteTableId,
      privateSubnet2.Subnet.SubnetId
    );

    const rtaInfra = await table.createRouteTableAssociation(
      data,
      (
        await infraRouteTable
      ).RouteTable.RouteTableId,
      infraSubnet.Subnet.SubnetId
    );

    const intgw = await gws.createItgw(data, vpc.Vpc.VpcId);
    const itgwID = await intgw.InternetGateway.InternetGatewayId;

    // // // -------------------------  Create AWS Routes for network communication -----------------//

    const publicRoute = await table.createItgwRoutes(
      data,
      "0.0.0.0/0",
      itgwID,
      publicRouteTable.RouteTable.RouteTableId
    );

    const infraRoute = await table.createItgwRoutes(
      data,
      "0.0.0.0/0",
      itgwID,
      infraRouteTable.RouteTable.RouteTableId
    );

    setTimeout(() => {
      const privateRoute = table.createNatGwRoutes(
        data,
        "0.0.0.0/0",
        natgw.NatGateway.NatGatewayId,
        privateRouteTable.RouteTable.RouteTableId
      );
    }, 5000);

    // //Create AWS Security Group

    const eksSG = await sg.createSecurityGroup(data, "cluster", vpc.Vpc.VpcId);
    const nodeEksSG = await sg.createSecurityGroup(
      data,
      "eks-nodes",
      vpc.Vpc.VpcId
    );

    // Create AWS Security Rules

    // HTTPS
    const httpsControlPlaneAccess = await sg.createSecurityRules(
      data,
      443,
      443,
      "tcp",
      eksSG.GroupId,
      nodeEksSG.GroupId
    );

    const httpsWorkerAccess = await sg.createSecurityRules(
      data,
      443,
      443,
      "tcp",
      nodeEksSG.GroupId,
      eksSG.GroupId
    );

    // // Nodes Security
    // // ALL ALL
    const AllWorkerAccess = await sg.createSecurityRules(
      data,
      0,
      65535,
      "-1",
      nodeEksSG.GroupId,
      nodeEksSG.GroupId
    );

    // // 1025 - 65535
    const communicationWorkerAccess = await sg.createSecurityRules(
      data,
      1025,
      65535,
      "-1",
      nodeEksSG.GroupId,
      eksSG.GroupId
    );

    // // 10250
    const healthEndpointWorkerAccess = await sg.createSecurityRules(
      data,
      10250,
      10250,
      "tcp",
      nodeEksSG.GroupId,
      eksSG.GroupId
    );

    // logger.log.info("Kubernetes starts here");
    // // ------------------------- Create EKS cluster ---------------------------------//
    const eksClusters = eksCluster.createEKS(
      data,
      eksSG.GroupId,
      privateSubnet1.Subnet.SubnetId,
      privateSubnet2.Subnet.SubnetId
    );

    // const ltmp = await createLaunchTemplate(deployment, eksNodesSgDefault);

    // setTimeout(() => {
    //   logger.log.info("Kubernetes Node Group creation starts here");
    //   eks.createNodegroup(
    //     {
    //       clusterName: `${deployment.name}-eks-cluster` /* required */,
    //       nodeRole:
    //         "arn:aws:iam::735968160530:role/AWS-Nodes-Role" /* required */,
    //       nodegroupName: `${deployment.name}-eks-nodes` /* required */,
    //       subnets: [
    //         subnetprivOne.Subnet.SubnetId,
    //         subnetprivTwo.Subnet.SubnetId,
    //       ],
    //       labels: {
    //         "cluster-name": `${deployment.name}-eks-cluster`,
    //       },
    //       scalingConfig: {
    //         desiredSize: "2",
    //         maxSize: "2",
    //         minSize: "1",
    //       },
    //       tags: {
    //         "cluster-name": `${deployment.name}-eks-cluster`,
    //         [`kubernetes.io/cluster/${deployment.name}-eks-cluster`]: "owned",
    //       },
    //       launchTemplate: {
    //         id: ltmp.LaunchTemplate.LaunchTemplateId,
    //         version: `${ltmp.LaunchTemplate.LatestVersionNumber}`,
    //       },
    //     },
    //     function (err, data) {
    //       if (err) console.log(err, err.stack);
    //       // an error occurred
    //       else console.log(data); // successful response
    //     }
    //   );
    // }, 12 * 60 * 1000);

    // // // ------------------------- Change Object DeploymentModel properties and insert deployment data  -------//
    // (deploymentModel.name = deployment.name),
    //   (deploymentModel.VpcId = vpc.Vpc.VpcId),
    //   (deploymentModel.cidr_block = deployment.cidr_block),
    //   (deploymentModel.privateOneSubnetId = subnetprivOne.Subnet.SubnetId),
    //   (deploymentModel.privateTwoSubnetId = subnetprivTwo.Subnet.SubnetId),
    //   (deploymentModel.publicOneSubnetId = subnetpubOne.Subnet.SubnetId),
    //   (deploymentModel.publicTwoSubnetId = subnetpubTwo.Subnet.SubnetId),
    //   (deploymentModel.privateOneSubnetCidr = deployment.subnet_prv_cidr_one),
    //   (deploymentModel.privateOneSubnetCidr = deployment.subnet_prv_cidr_two),
    //   (deploymentModel.publicOneSubnetCidr = deployment.subnet_public_cidr_one),
    //   (deploymentModel.publicTwoSubnetCidr = deployment.subnet_public_cidr_two),
    //   (deploymentModel.infraSubnetCidr = deployment.subnet_infra_cidr),
    //   (deploymentModel.publicRouteTableId = rt_pub.RouteTable.RouteTableId),
    //   (deploymentModel.privateRouteTableId = rt_priv.RouteTable.RouteTableId),
    //   (deploymentModel.infraSubnetId = infraSubnet.Subnet.SubnetId),
    //   (deploymentModel.infraRouteTableId = rt_infra.RouteTable.RouteTableId),
    //   (deploymentModel.itgw =
    //     internetGateway.InternetGateway.InternetGatewayId),
    //   (deploymentModel.eip = eip.AllocationId);
    // deploymentModel.natgw = natgw.NatGateway.NatGatewayId;
    // deploymentModel.eksArn = await (await eksCluster).cluster.arn;

    // // // // -------------------------  Save Data to the MongoDB database -----------------//

    // db.saveData(deploymentModel);
    // // -------------------------  Log success result to the console ----------------//
    // logger.log.info(
    //   `Deployment ${
    //     deployment.name
    //   } information were inserted into the database. Please see the create informations here: ${JSON.stringify(
    //     deploymentModel
    //   )}`
    // );
  } catch (error) {
    logger.log.error(
      `Deployment ${data.name} was  not created! There was an error. Please see the error bellow: ${error}`
    );
  }
};

module.exports = {
  createDeployment,
};

// async function createLaunchTemplate(deployment, eksSgDefault) {
//   const ec2 = new AWS.EC2({ region: deployment.region });
//   const ltmp = await ec2
//     .createLaunchTemplate({
//       LaunchTemplateData: {
//         InstanceType: "m5.large",
//         BlockDeviceMappings: [
//           {
//             DeviceName: "/dev/xvda",
//             Ebs: {
//               DeleteOnTermination: true,
//               Encrypted: true,
//               VolumeSize: "30",
//               VolumeType: "gp2",
//             },
//           },
//           /* more items */
//         ],
//         SecurityGroupIds: [eksSgDefault.GroupId],
//       },
//       LaunchTemplateName: `${deployment.name}-eks-template`,
//     })
//     .promise();
//   return ltmp;
// }
