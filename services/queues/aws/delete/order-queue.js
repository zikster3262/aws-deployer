const Queue = require("bull");

const { processJobs } = require("./jobs-queue-consumer");
// Our queue
const jobsQueue = new Queue("deleteJobs", "redis://127.0.0.1:6379");

jobsQueue.process(processJobs);

const createDeleteDeployment = (job) => {
  jobsQueue.add(job, { delay: 5000 });
};

module.exports = {
  createDeleteDeployment,
};
