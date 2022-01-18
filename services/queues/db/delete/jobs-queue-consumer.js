const db = require("../../../db/db");

const processJobsdeleteData = async (job) => {
  console.log("Processing the Job. Deleting data from database.");
  db.deleteData(job.data._id);
  done();
};

module.exports = {
  processJobsdeleteData,
};
