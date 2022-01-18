const Queue = require("bull");

const { processJobsInsertData } = require("./jobs-queue-consumer");
// Our queue
const dataQueue = new Queue("insert", "redis://127.0.0.1:6379");

dataQueue.process(processJobsInsertData);

const insertData = (job) => {
  dataQueue.add(job, { delay: 5000 });
};

module.exports = {
  insertData,
};
