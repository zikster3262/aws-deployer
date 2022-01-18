const dp = require("../../../aws/delete");

const processJobs = async (job) => {
  console.log("Processing the Job from Delete Queue.");
  dp.deleteDeployment(job.data);
  done();
};

module.exports = {
  processJobs,
};
