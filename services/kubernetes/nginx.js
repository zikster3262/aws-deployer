const YAML = require("yaml");
const { KubeConfig } = require("@kubernetes/client-node");
const logger = require("../../utils/logger");
const k8s = require("@kubernetes/client-node");
const fs = require("fs");
const jyaml = require("js-yaml");
const { promisify } = require("es6-promisify");
const k8sConfig = require("../../services/aws/service/kb");

async function deployNginx(data) {
  const kubeConfig = await k8sConfig.createKubeconfig(data);
  const yaml = new YAML.Document();
  yaml.contents = kubeConfig;

  const kc = new k8s.KubeConfig();
  kc.loadFromString(yaml);
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  k8sApi.createNamespace({
    metadata: {
      name: "nginx",
    },
  });

  const client = k8s.KubernetesObjectApi.makeApiClient(kc);
  const fsReadFileP = promisify(fs.readFile);
  const specString = await fsReadFileP(
    "./services/kubernetes/nginx.yaml",
    "utf8"
  );
  const specs = jyaml.loadAll(specString);
  const validSpecs = specs.filter((s) => s && s.kind && s.metadata);
  const created = [];
  for (const spec of validSpecs) {
    // this is to convince the old version of TypeScript that metadata exists even though we already filtered specs
    // without metadata out
    spec.metadata = spec.metadata || {};
    spec.metadata.annotations = spec.metadata.annotations || {};
    delete spec.metadata.annotations[
      "kubectl.kubernetes.io/last-applied-configuration"
    ];
    spec.metadata.annotations[
      "kubectl.kubernetes.io/last-applied-configuration"
    ] = JSON.stringify(spec);
    try {
      // try to get the resource, if it does not exist an error will be thrown and we will end up in the catch
      // block.
      await client.read(spec);
      // we got the resource, so it exists, so patch it
      const response = await client.patch(spec);
      created.push(response.body);
    } catch (e) {
      // we did not get the resource, so it does not exist, so create it
      const response = await client.create(spec);
      created.push(response.body);
    }
  }
  logger.log.info("Nginx created.");
  return created;
}

async function deleteNginx(data) {
  const kubeConfig = await k8sConfig.createKubeconfig(data);
  const yaml = new YAML.Document();
  yaml.contents = kubeConfig;

  const kc = new k8s.KubeConfig();
  kc.loadFromString(yaml);
  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
  k8sApi.deleteNamespace("nginx");
  logger.log.info("Delete NGINX namespace.");
}

module.exports = {
  deployNginx,
  deleteNginx,
};
