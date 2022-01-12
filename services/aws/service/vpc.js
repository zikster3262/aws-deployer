const AWS = require("aws-sdk");

async function createVpc(vpc) {
  const ec2 = new AWS.EC2({ region: vpc.region });
  const vpc = await ec2
    .createVpc({
      CidrBlock: `${vpc.cidr_block}`,
      TagSpecifications: [
        {
          ResourceType: "vpc",
          Tags: [
            {
              Key: "Name",
              Value: `vpc-${vpc.name}`,
            },
            {
              Key: `kubernetes.io/cluster/${vpc.name}-eks-cluster`,
              Value: "shared",
            },
          ],
        },
      ],
    })
    .promise();
  return vpc;
}
