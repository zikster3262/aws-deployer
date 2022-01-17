const EKSToken = require("aws-eks-token");
const cinfo = require("./eks");
const config = require("../../../config/region");
const logger = require("../../../utils/logger");

async function getToken(region, name) {
  EKSToken.config = {
    region: region,
  };

  try {
    const token = EKSToken.renew(name);
    return token;
  } catch (error) {}
}

async function createKubeconfig(data) {
  const cluster = await cinfo.describeCluster(data);
  const token = await getToken(data.region, `${data.name}-cluster`);

  try {
    const kubeconfig = await {
      apiVersion: "v1",
      clusters: [
        {
          cluster: {
            server: cluster.cluster.endpoint,
            "certificate-authority-data":
              cluster.cluster.certificateAuthority.data,
          },
          name: cluster.cluster.arn,
        },
      ],
      contexts: [
        {
          context: {
            cluster: cluster.cluster.arn,
            user: cluster.cluster.arn,
          },
          name: cluster.cluster.arn,
        },
      ],
      "current-context": cluster.cluster.arn,
      kind: "Config",
      preferences: {},
      users: [
        {
          name: cluster.cluster.arn,
          user: {
            token: token,
            exec: {
              apiVersion: "client.authentication.k8s.io/v1alpha1",
              args: [
                "--region",
                `${data.region}`,
                "eks",
                "get-token",
                "--cluster-name",
                `${data.name}-cluster`,
              ],
              command: "aws",
            },
          },
        },
      ],
    };
    logger.log.info(`Kubeconfig for ${data.name}-cluster was created.`);
    return kubeconfig;
  } catch (error) {
    logger.log.error(error);
  }
}

module.exports = {
  createKubeconfig,
};
