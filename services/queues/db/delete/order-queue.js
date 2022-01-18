const Queue = require("bull");

const { processJobsdeleteData } = require("./jobs-queue-consumer");
// Our queue
const deleteQueue = new Queue("delete", "redis://127.0.0.1:6379");

deleteQueue.process(processJobsdeleteData);

const deleteData = (job) => {
  deleteQueue.add(job, { delay: 5000 });
};

module.exports = {
  deleteData,
};
