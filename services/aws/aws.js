const AWS = require("aws-sdk");
const config = require("../../config/region");
const logger = require("../../utils/logger");
const VPC = require("./service/vpc");
const Subnet = require("./service/subnets");
const gws = require("./service/gws");
const table = require("./service/rt");
const sg = require("./service/sg");
const eksClass = require("./service/eks");
AWS.config.update({ region: config.region });
const db = require("../db/db");
require("dotenv").config();
const k8sConfig = require("./service/kb");
const YAML = require("yaml");
const { KubeConfig } = require("@kubernetes/client-node");
const k8s = require("@kubernetes/client-node");

// Create empty deployment model object
const Model = {};

const createDeployment = async (data) => {
  console.log(data);
  try {
    const ec2 = new AWS.EC2({ region: data.region });
    const eks = new AWS.EKS({ region: data.region });
    // --------------------------- Creation of VPC  -------------------------------------------------------------//

    const vpc = await VPC.createVpc(data);
    const enableVpcHostResolution = VPC.enableVpcDnsResolution(
      vpc.Vpc.VpcId,
      data
    );

    // --------------------------- Creation of Subnets  -------------------------------------------------------------//
    const privateSubnet1 = await Subnet.createSubnet(
      data,
      "privateSubnet1",
      data.subnet1,
      vpc.Vpc.VpcId,
      "a",
      "kubernetes.io/role/internal-elb"
    );

    const privateSubnet2 = await Subnet.createSubnet(
      data,
      "privateSubnet2",
      data.subnet2,
      vpc.Vpc.VpcId,
      "b",
      "kubernetes.io/role/internal-elb"
    );

    const pubSubnet1 = await Subnet.createSubnet(
      data,
      "publicSubnet1",
      data.subnet3,
      vpc.Vpc.VpcId,
      "a",
      "kubernetes.io/role/elb"
    );
    const pubSubnet2 = await Subnet.createSubnet(
      data,
      "publicSubnet2",
      data.subnet4,
      vpc.Vpc.VpcId,
      "b",
      "kubernetes.io/role/elb"
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
    }, 7000);

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

    const privateSubnetRule1 = await sg.createDestinationSecurityRules(
      data,
      0,
      65535,
      "-1",
      nodeEksSG.GroupId,
      privateSubnet1.Subnet.CidrBlock
    );

    const privateSubnetRule2 = await sg.createDestinationSecurityRules(
      data,
      0,
      65535,
      "-1",
      nodeEksSG.GroupId,
      privateSubnet2.Subnet.CidrBlock
    );

    // // ------------------------- Create EKS cluster ---------------------------------//
    const cluster = await eksClass.createEKS(
      data,
      eksSG.GroupId,
      privateSubnet1.Subnet.SubnetId,
      privateSubnet2.Subnet.SubnetId
    );

    // // ------------------------- Create Launch Template ---------------------------------//

    const ltmp = await eksClass.createLaunchTemplate(data, nodeEksSG.GroupId);
    setTimeout(() => {
      kubeTest(data);
    }, 14 * 60 * 1000);

    setTimeout(() => {
      const eksNodes = eksClass.createNodeGroup(
        data,
        privateSubnet1.Subnet.SubnetId,
        privateSubnet2.Subnet.SubnetId,
        ltmp
      );
    }, 16 * 60 * 1000);
    // ------------------------- Change Object DeploymentModel properties and insert deployment data  -------//
    Model.name = data.name;
    Model.vpc_cidrBlock = data.cidr_block;
    Model.vpcID = vpc.Vpc.VpcId;
    Model.privateSubnet1Id = privateSubnet1.Subnet.SubnetId;
    Model.privateSubnet2Id = privateSubnet2.Subnet.SubnetId;
    Model.privateSubnet1Cidr = privateSubnet1.Subnet.CidrBlock;
    Model.privateSubnet2Cidr = privateSubnet2.Subnet.CidrBlock;
    Model.publicSubnet1Id = pubSubnet1.Subnet.SubnetId;
    Model.publicSubnet2Id = pubSubnet2.Subnet.SubnetId;
    Model.publiceSubnet1Cidr = pubSubnet1.Subnet.CidrBlock;
    Model.publiceSubnet2Cidr = pubSubnet2.Subnet.CidrBlock;
    Model.infraSubnetId = infraSubnet.Subnet.SubnetId;
    Model.infraSubnetCidr = infraSubnet.Subnet.CidrBlock;
    Model.privateRouteTable = privateRouteTable.RouteTable.RouteTableId;
    Model.publicRouteTable = publicRouteTable.RouteTable.RouteTableId;
    Model.infraRouteTable = infraRouteTable.RouteTable.RouteTableId;
    Model.intgwId = intgw.InternetGateway.InternetGatewayId;
    Model.natgw = natgw.NatGateway.NatGatewayId;
    Model.eksArn = cluster.cluster.arn;
    // -------------------------  Save Data to the MongoDB database -----------------//

    db.saveData(Model);
    // -------------------------  Log success result to the console ----------------//
    logger.log.info(
      `Deployment ${
        data.name
      } information were inserted into the database. Info here: \n ${JSON.stringify(
        Model
      )}`
    );
  } catch (error) {
    logger.log.error(
      `Deployment ${data.name} was  not created! There was an error. Please see the error bellow: ${error}`
    );
  }
};

module.exports = {
  createDeployment,
};

async function kubeTest(data) {
  const kubeConfig = await k8sConfig.createKubeconfig(data);
  const yaml = new YAML.Document();
  yaml.contents = kubeConfig;

  const kc = new k8s.KubeConfig();
  kc.loadFromString(yaml);
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  k8sApi.createNamespacedConfigMap("kube-system", {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: {
      name: "aws-auth",
      namespace: "kube-system",
    },
    data: {
      mapRoles:
        "- rolearn: arn:aws:iam::735968160530:role/AWS-Nodes-Role\n  username: system:node:{{EC2PrivateDNSName}}\n  groups:\n    - system:bootstrappers\n    - system:nodes\n",
    },
  });
}
