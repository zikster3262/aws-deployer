const { MongoClient } = require("mongodb");
let ObjectID = require("mongodb").ObjectID;
const logger = require("../../utils/logger");

const database = "AWS";
const uri = `mongodb+srv://zikster:Tran3262@app.hykmu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// VPC
async function saveData(data) {
  const db = await MongoClient.connect(uri);
  var dbo = db.db(database);
  const result = await dbo
    .collection("vpcs")
    .insertOne(data, function (err, info) {
      if (err) {
        logger.log.error("Error occurred while inserting to the database");
      } else {
        logger.log.info("Data have been inserted into the database.");
      }
    });
  return result;
}

async function findData(name) {
  const db = await MongoClient.connect(uri);
  var dbo = db.db(database);
  const result = await dbo.collection("vpcs").findOne({ name: name });
  if (result) {
    return result;
  } else {
    return false;
  }
}

module.exports = {
  saveData,
  findData,
};
