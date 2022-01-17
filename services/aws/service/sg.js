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
    logger.log.error(error);
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
    logger.log.error(error);
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
    logger.log.error(error);
  }
}

async function deleteDestinationSecurityRules(
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
      .revokeSecurityGroupIngress({
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
    logger.log.error(error);
  }
}

async function deleteSG(data, sg) {
  const ec2 = await new AWS.EC2({ region: data.region });
  try {
    const sgGroup = await ec2.deleteSecurityGroup(
      {
        GroupId: sg,
      },
      function (err, result) {
        if (err) {
          console.log(`SG was not deleted! Error: \n ${err}`);
        } else {
          console.log(result);
          logger.log.info(`SG ${sg} was deleted!`);
        }
      }
    );
    logger.log.info(`SG Group ${sg} was deleted`);

    return sgGroup;
  } catch (error) {
    logger.log.error(error);
  }
}

async function deleteSecurityRules(
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
      .revokeSecurityGroupIngress({
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

    logger.log.info(`SG Rule ${destination}-${source} was revoked!`);

    return rule;
  } catch (error) {
    logger.log.error(error);
  }
}

module.exports = {
  createSecurityGroup,
  createSecurityRules,
  createDestinationSecurityRules,
  deleteSG,
  deleteSecurityRules,
  deleteDestinationSecurityRules,
};
