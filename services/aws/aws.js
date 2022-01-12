const AWS = require("aws-sdk");
const config = require("../../config/region");
const logger = require("../../utils/logger");
AWS.config.update({ region: config.region });
const db = require("../db/db");
require("dotenv").config();

// Create empty deployment model object
const deploymentModel = {};

const createDeployment = async (deployment) => {
  console.log(deployment);
  try {
    const eksClusterTag = `kubernetes.io/cluster/${deployment.name}-eks-cluster`;
    const ec2 = new AWS.EC2({ region: deployment.region });
    const eks = new AWS.EKS({ region: deployment.region });
    // --------------------------- Creation of VPC  -------------------------------------------------------------//
    const vpc = await ec2
      .createVpc({
        CidrBlock: `${deployment.cidr_block}`,
        TagSpecifications: [
          {
            ResourceType: "vpc",
            Tags: [
              {
                Key: "Name",
                Value: `vpc-${deployment.name}`,
              },
              {
                Key: `kubernetes.io/cluster/${deployment.name}-eks-cluster`,
                Value: "shared",
              },
            ],
          },
        ],
      })
      .promise();

    // -------------------------   Creation of Subnets -----------------------------------------------------//
    const subnetprivOne = await ec2
      .createSubnet({
        CidrBlock: `${deployment.subnet_prv_cidr_one}`,
        VpcId: `${vpc.Vpc.VpcId}`,
        AvailabilityZone: `${deployment.region}a`,
        TagSpecifications: [
          {
            ResourceType: "subnet",
            Tags: [
              {
                Key: "Name",
                Value: `priv-${deployment.name}-one`,
              },
              {
                Key: "kubernetes.io/role/internal-elb",
                Value: "1",
              },
              {
                Key: `kubernetes.io/cluster/${deployment.name}-eks-cluster`,
                Value: "shared",
              },
            ],
          },
        ],
      })
      .promise();

    const subnetprivTwo = await ec2
      .createSubnet({
        CidrBlock: `${deployment.subnet_prv_cidr_two}`,
        AvailabilityZone: `${deployment.region}b`,
        VpcId: `${vpc.Vpc.VpcId}`,
        TagSpecifications: [
          {
            ResourceType: "subnet",
            Tags: [
              {
                Key: "Name",
                Value: `priv-${deployment.name}-two`,
              },
              {
                Key: "kubernetes.io/role/internal-elb",
                Value: "1",
              },
              {
                Key: `kubernetes.io/cluster/${deployment.name}-eks-cluster`,
                Value: "shared",
              },
            ],
          },
        ],
      })
      .promise();
    const subnetpubOne = await ec2
      .createSubnet({
        CidrBlock: deployment.subnet_public_cidr_one,
        VpcId: vpc.Vpc.VpcId,
        AvailabilityZone: `${deployment.region}a`,
        TagSpecifications: [
          {
            ResourceType: "subnet",
            Tags: [
              {
                Key: "Name",
                Value: `pub-${deployment.name}-one`,
              },
              {
                Key: "kubernetes.io/role/elb",
                Value: "1",
              },
              {
                Key: `kubernetes.io/cluster/${deployment.name}-eks-cluster`,
                Value: "shared",
              },
            ],
          },
        ],
      })
      .promise();

    const subnetpubTwo = await ec2
      .createSubnet({
        CidrBlock: deployment.subnet_public_cidr_two,
        VpcId: vpc.Vpc.VpcId,
        AvailabilityZone: `${deployment.region}b`,
        TagSpecifications: [
          {
            ResourceType: "subnet",
            Tags: [
              {
                Key: "Name",
                Value: `pub-${deployment.name}-two`,
              },
              {
                Key: "kubernetes.io/role/elb",
                Value: "1",
              },
              {
                Key: `kubernetes.io/cluster/${deployment.name}-eks-cluster`,
                Value: "shared",
              },
            ],
          },
        ],
      })
      .promise();

    const infraSubnet = await ec2
      .createSubnet({
        CidrBlock: deployment.subnet_infra_cidr,
        VpcId: vpc.Vpc.VpcId,
        TagSpecifications: [
          {
            ResourceType: "subnet",
            Tags: [
              {
                Key: "Name",
                Value: `infra-${deployment.name}`,
              },
            ],
          },
        ],
      })
      .promise();
    // -------------------------   Create Elastic IP ---------------------------------------------//
    const eip = await ec2
      .allocateAddress({
        TagSpecifications: [
          {
            ResourceType: "elastic-ip",
            Tags: [
              {
                Key: "Name",
                Value: `eip-${deployment.name}`,
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
        SubnetId: infraSubnet.Subnet.SubnetId,
        TagSpecifications: [
          {
            ResourceType: "natgateway",
            Tags: [
              {
                Key: "Name",
                Value: `natgw-${deployment.name}`,
              },
            ],
          },
        ],
      })
      .promise();

    // -------------------------  Creation of Route Tables --------------------------------/
    const rt_infra = await ec2
      .createRouteTable({
        VpcId: `${vpc.Vpc.VpcId}`,
        TagSpecifications: [
          {
            ResourceType: "route-table",
            Tags: [
              {
                Key: "Name",
                Value: `infra-rt-${deployment.name}`,
              },
            ],
          },
        ],
      })
      .promise();

    const rt_priv = await ec2
      .createRouteTable({
        VpcId: `${vpc.Vpc.VpcId}`,
        TagSpecifications: [
          {
            ResourceType: "route-table",
            Tags: [
              {
                Key: "Name",
                Value: `priv-rt-${deployment.name}`,
              },
            ],
          },
        ],
      })
      .promise();

    const rt_pub = await ec2
      .createRouteTable({
        VpcId: `${vpc.Vpc.VpcId}`,
        TagSpecifications: [
          {
            ResourceType: "route-table",
            Tags: [
              {
                Key: "Name",
                Value: `pub-rt-${deployment.name}`,
              },
            ],
          },
        ],
      })
      .promise();

    // // -------------------------  Creation of Route Tables Association ------------------------//
    const privOneRouteTableAssociation = await ec2
      .associateRouteTable({
        RouteTableId: rt_priv.RouteTable.RouteTableId,
        SubnetId: subnetprivOne.Subnet.SubnetId,
      })
      .promise();

    const privTwoRouteTableAssociation = await ec2
      .associateRouteTable({
        RouteTableId: rt_priv.RouteTable.RouteTableId,
        SubnetId: subnetprivTwo.Subnet.SubnetId,
      })
      .promise();

    const pubOneRouteTableAssociation = await ec2
      .associateRouteTable({
        RouteTableId: rt_pub.RouteTable.RouteTableId,
        SubnetId: subnetpubOne.Subnet.SubnetId,
      })
      .promise();

    const pubTwoRouteTableAssociation = await ec2
      .associateRouteTable({
        RouteTableId: rt_pub.RouteTable.RouteTableId,
        SubnetId: subnetpubTwo.Subnet.SubnetId,
      })
      .promise();

    const infraRouteTableAssociation = await ec2
      .associateRouteTable({
        RouteTableId: rt_infra.RouteTable.RouteTableId,
        SubnetId: infraSubnet.Subnet.SubnetId,
      })
      .promise();

    // Create Internet Gateway
    const internetGateway = await ec2
      .createInternetGateway({
        TagSpecifications: [
          {
            ResourceType: "internet-gateway",
            Tags: [
              {
                Key: "Name",
                Value: `itgw-${deployment.name}`,
              },
            ],
          },
        ],
      })
      .promise();

    const internetGatewayAttachment = await ec2
      .attachInternetGateway({
        InternetGatewayId: internetGateway.InternetGateway.InternetGatewayId,
        VpcId: vpc.Vpc.VpcId,
      })
      .promise();

    // // -------------------------  Create AWS Routes for network communication -----------------//

    const publicItRoute = await ec2
      .createRoute({
        DestinationCidrBlock: "0.0.0.0/0",
        GatewayId: internetGateway.InternetGateway.InternetGatewayId,
        RouteTableId: rt_pub.RouteTable.RouteTableId,
      })
      .promise();

    setTimeout(() => {
      const privateItRoute = ec2
        .createRoute({
          DestinationCidrBlock: "0.0.0.0/0",
          NatGatewayId: natgw.NatGateway.NatGatewayId,
          RouteTableId: rt_priv.RouteTable.RouteTableId,
        })
        .promise();
    }, 6000);

    const infraItRoute = await ec2
      .createRoute({
        DestinationCidrBlock: "0.0.0.0/0",
        GatewayId: internetGateway.InternetGateway.InternetGatewayId,
        RouteTableId: rt_infra.RouteTable.RouteTableId,
      })
      .promise();

    //Create AWS Security Group

    const sgDefault = await ec2
      .createSecurityGroup({
        Description: `Default security group for ${deployment.name}-vpc.`,
        GroupName: `${deployment.name}-sg-default`,
        VpcId: vpc.Vpc.VpcId,
        TagSpecifications: [
          {
            ResourceType: "security-group",
            Tags: [
              {
                Key: "Name",
                Value: `sg-default-${deployment.name}`,
              },
            ],
          },
        ],
      })
      .promise();

    // ------------------------- Create Kubernetes Cluster Security Rules --------------------------//
    const eksSgDefault = await ec2
      .createSecurityGroup({
        Description: `Default security group eks for ${deployment.name}-sg.`,
        GroupName: `${deployment.name}-eks-sg-default`,
        VpcId: vpc.Vpc.VpcId,
        TagSpecifications: [
          {
            ResourceType: "security-group",
            Tags: [
              {
                Key: "Name",
                Value: `eks-sg-${deployment.name}`,
              },
              {
                Key: `kubernetes.io/cluster/${deployment.name}-eks-cluster`,
                Value: "owned",
              },
            ],
          },
        ],
      })
      .promise();

    const eksNodesSgDefault = await ec2
      .createSecurityGroup({
        Description: `Default security group eks nodes for ${deployment.name}-sg-nodes.`,
        GroupName: `${deployment.name}-eks-nodes-sg-default`,
        VpcId: vpc.Vpc.VpcId,
        TagSpecifications: [
          {
            ResourceType: "security-group",
            Tags: [
              {
                Key: "Name",
                Value: `eks-nodes-sg-${deployment.name}`,
              },
              {
                Key: `kubernetes.io/cluster/${deployment.name}-eks-cluster`,
                Value: "owned",
              },
            ],
          },
        ],
      })
      .promise();

    // HTTPS
    const controlPlaneHTTPs = await ec2
      .authorizeSecurityGroupIngress({
        GroupId: eksSgDefault.GroupId,
        IpPermissions: [
          {
            FromPort: 443,
            ToPort: 443,
            IpProtocol: "tcp",
            UserIdGroupPairs: [
              {
                GroupId: eksNodesSgDefault.GroupId,
              },
            ],
          },
        ],
      })
      .promise();

    const workerNodesHTTPs = await ec2
      .authorizeSecurityGroupIngress({
        GroupId: eksNodesSgDefault.GroupId,
        IpPermissions: [
          {
            FromPort: 443,
            ToPort: 443,
            IpProtocol: "tcp",
            UserIdGroupPairs: [
              {
                GroupId: eksSgDefault.GroupId,
              },
            ],
          },
        ],
      })
      .promise();

    // Nodes Security

    // ALL ALL
    const allAccessToNodes = await ec2
      .authorizeSecurityGroupIngress({
        GroupId: eksNodesSgDefault.GroupId,
        IpPermissions: [
          {
            FromPort: 0,
            ToPort: 65535,
            IpProtocol: "-1",
            UserIdGroupPairs: [
              {
                GroupId: eksNodesSgDefault.GroupId,
              },
            ],
          },
        ],
      })
      .promise();

    // 1025 - 65535
    const eksNodePortAccess = await ec2
      .authorizeSecurityGroupIngress({
        GroupId: eksNodesSgDefault.GroupId,
        IpPermissions: [
          {
            FromPort: 1025,
            ToPort: 65535,
            IpProtocol: "-1",
            UserIdGroupPairs: [
              {
                GroupId: eksSgDefault.GroupId,
              },
            ],
          },
        ],
      })
      .promise();

    // 10250
    const workerIngressKubelet = await ec2
      .authorizeSecurityGroupIngress({
        GroupId: eksNodesSgDefault.GroupId,
        IpPermissions: [
          {
            FromPort: 10250,
            ToPort: 10250,
            IpProtocol: "tcp",
            UserIdGroupPairs: [
              {
                GroupId: eksSgDefault.GroupId,
              },
            ],
          },
        ],
      })
      .promise();

    logger.log.info("Kubernetes starts here");
    // ------------------------- Create EKS cluster ---------------------------------//
    const eksCluster = eks
      .createCluster({
        version: "1.21",
        name: `${deployment.name}-eks-cluster`,
        resourcesVpcConfig: {
          securityGroupIds: [eksSgDefault.GroupId],
          subnetIds: [
            subnetprivOne.Subnet.SubnetId,
            subnetprivTwo.Subnet.SubnetId,
          ],
          endpointPublicAccess: true,
          publicAccessCidrs: ["78.102.216.207/32"],
        },
        roleArn: "arn:aws:iam::735968160530:role/Management-EKS",
        tags: {
          "cluster-name": `${deployment.name}-eks-cluster`,
          [`kubernetes.io/cluster/${deployment.name}-eks-cluster`]: "owned",
        },
      })
      .promise();

    const ltmp = await createLaunchTemplate(deployment, eksNodesSgDefault);

    setTimeout(() => {
      logger.log.info("Kubernetes Node Group creation starts here");
      eks.createNodegroup(
        {
          clusterName: `${deployment.name}-eks-cluster` /* required */,
          nodeRole:
            "arn:aws:iam::735968160530:role/AWS-Nodes-Role" /* required */,
          nodegroupName: `${deployment.name}-eks-nodes` /* required */,
          subnets: [
            subnetprivOne.Subnet.SubnetId,
            subnetprivTwo.Subnet.SubnetId,
          ],
          labels: {
            "cluster-name": `${deployment.name}-eks-cluster`,
          },
          scalingConfig: {
            desiredSize: "2",
            maxSize: "2",
            minSize: "1",
          },
          tags: {
            "cluster-name": `${deployment.name}-eks-cluster`,
            [`kubernetes.io/cluster/${deployment.name}-eks-cluster`]: "owned",
          },
          launchTemplate: {
            id: ltmp.LaunchTemplate.LaunchTemplateId,
            version: `${ltmp.LaunchTemplate.LatestVersionNumber}`,
          },
        },
        function (err, data) {
          if (err) console.log(err, err.stack);
          // an error occurred
          else console.log(data); // successful response
        }
      );
    }, 12 * 60 * 1000);

    // // ------------------------- Change Object DeploymentModel properties and insert deployment data  -------//
    (deploymentModel.name = deployment.name),
      (deploymentModel.VpcId = vpc.Vpc.VpcId),
      (deploymentModel.cidr_block = deployment.cidr_block),
      (deploymentModel.privateOneSubnetId = subnetprivOne.Subnet.SubnetId),
      (deploymentModel.privateTwoSubnetId = subnetprivTwo.Subnet.SubnetId),
      (deploymentModel.publicOneSubnetId = subnetpubOne.Subnet.SubnetId),
      (deploymentModel.publicTwoSubnetId = subnetpubTwo.Subnet.SubnetId),
      (deploymentModel.privateOneSubnetCidr = deployment.subnet_prv_cidr_one),
      (deploymentModel.privateOneSubnetCidr = deployment.subnet_prv_cidr_two),
      (deploymentModel.publicOneSubnetCidr = deployment.subnet_public_cidr_one),
      (deploymentModel.publicTwoSubnetCidr = deployment.subnet_public_cidr_two),
      (deploymentModel.infraSubnetCidr = deployment.subnet_infra_cidr),
      (deploymentModel.publicRouteTableId = rt_pub.RouteTable.RouteTableId),
      (deploymentModel.privateRouteTableId = rt_priv.RouteTable.RouteTableId),
      (deploymentModel.infraSubnetId = infraSubnet.Subnet.SubnetId),
      (deploymentModel.infraRouteTableId = rt_infra.RouteTable.RouteTableId),
      (deploymentModel.itgw =
        internetGateway.InternetGateway.InternetGatewayId),
      (deploymentModel.eip = eip.AllocationId);
    deploymentModel.natgw = natgw.NatGateway.NatGatewayId;
    deploymentModel.eksArn = await (await eksCluster).cluster.arn;

    // // // -------------------------  Save Data to the MongoDB database -----------------//

    db.saveData(deploymentModel);
    // -------------------------  Log success result to the console ----------------//
    logger.log.info(
      `Deployment ${
        deployment.name
      } information were inserted into the database. Please see the create informations here: ${JSON.stringify(
        deploymentModel
      )}`
    );
  } catch (error) {
    logger.log.error(
      `Deployment ${deployment.name} was  not created! There was an error. Please see the error bellow: ${error}`
    );
  }
};

module.exports = {
  createDeployment,
};

async function createLaunchTemplate(deployment, eksSgDefault) {
  const ec2 = new AWS.EC2({ region: deployment.region });
  const ltmp = await ec2
    .createLaunchTemplate({
      LaunchTemplateData: {
        InstanceType: "m5.large",
        BlockDeviceMappings: [
          {
            DeviceName: "/dev/xvda",
            Ebs: {
              DeleteOnTermination: true,
              Encrypted: true,
              VolumeSize: "30",
              VolumeType: "gp2",
            },
          },
          /* more items */
        ],
        SecurityGroupIds: [eksSgDefault.GroupId],
      },
      LaunchTemplateName: `${deployment.name}-eks-template`,
    })
    .promise();
  return ltmp;
}
