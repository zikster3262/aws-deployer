const dp = require("../../../../services/aws/create");

const processJobs = async (job) => {
  console.log("Processing the Job");
  dp.createDeployment(job.data);
  done();
};

module.exports = {
  processJobs,
};
