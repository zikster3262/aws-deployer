const db = require("../../../../services/db/db");

const processJobsInsertData = async (job) => {
  console.log("Processing the Job. Inserting data into database.");
  db.saveData(job.data);
  done();
};

module.exports = {
  processJobsInsertData,
};
