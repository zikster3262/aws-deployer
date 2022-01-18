const Queue = require("bull");

const { processJobs } = require("./jobs-queue-consumer");
// Our queue
const jobsQueue = new Queue("createJobs", "redis://127.0.0.1:6379");

jobsQueue.process(processJobs);

const createNewDep = (job) => {
  jobsQueue.add(job, { delay: 5000 });
};

module.exports = {
  createNewDep,
};
