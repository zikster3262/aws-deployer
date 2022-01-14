const AWS = require("aws-sdk");
const logger = require("../../../utils/logger");

async function createSecurityGroup(data, name, vpcID) {
  const ec2 = await new AWS.EC2({ region: data.region });
  try {
    const sgGroup = await ec2
      .createSecurityGroup({
        Description: `Default security group for vpc-${data.name}.`,
        GroupName: `${name}${data.name}-sg-default`,
        VpcId: vpcID,
        TagSpecifications: [
          {
            ResourceType: "security-group",
            Tags: [
              {
                Key: "Name",
                Value: `${name}${data.name}-sg`,
              },
              {
                Key: `kubernetes.io/cluster/${data.name}-cluster`,
                Value: "owned",
              },
            ],
          },
        ],
      })
      .promise();
    logger.log.info(
      `Security Group ${name}-sg-default  was  created! ID - ${sgGroup.GroupId}`
    );
    return sgGroup;
  } catch (error) {
    logger.log.error(
      `Error: Security Group sg-default-${name} was  not created! There was an error. Please see the error bellow:\n ${error}`
    );
  }
}

async function createSecurityRules(
  data,
  from,
  to,
  protocol,
  source,
  destination
) {
  const ec2 = await new AWS.EC2({ region: data.region });
  try {
    const rule = await ec2
      .authorizeSecurityGroupIngress({
        GroupId: source,
        IpPermissions: [
          {
            FromPort: from,
            ToPort: to,
            IpProtocol: protocol,
            UserIdGroupPairs: [
              {
                GroupId: destination,
              },
            ],
          },
        ],
      })
      .promise();

    logger.log.info(`SG Rule ${destination}-${source} was  created!`);

    return rule;
  } catch (error) {
    logger.log.error(
      `Error: Security Group rule was  not created! There was an error. Please see the error bellow:\n ${error}`
    );
  }
}

async function createDestinationSecurityRules(
  data,
  from,
  to,
  protocol,
  source,
  destination
) {
  const ec2 = await new AWS.EC2({ region: data.region });
  try {
    const rule = await ec2
      .authorizeSecurityGroupIngress({
        GroupId: source,
        IpPermissions: [
          {
            FromPort: from,
            ToPort: to,
            IpProtocol: protocol,
            IpRanges: [
              {
                CidrIp: destination,
                Description: "Local Subnet opening for VPC",
              },
            ],
          },
        ],
      })
      .promise();

    logger.log.info(`SG IP Rule ${destination}-${source} was  created!`);

    return rule;
  } catch (error) {
    logger.log.error(
      `Error: Security Group rule ${destination} - ${source} was  not created! There was an error. Please see the error bellow:\n ${error}`
    );
  }
}

module.exports = {
  createSecurityGroup,
  createSecurityRules,
  createDestinationSecurityRules,
};
