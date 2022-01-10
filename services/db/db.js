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
  const vpc = await data;
  const db = await MongoClient.connect(uri);
  var dbo = db.db(database);
  const result = await dbo.collection("vpcs").insertOne(
    {
      Vpc_name: data.name,
      CidrBlock: data.cidr_block,
      VpcId: data.VpcId,
      privateOneSubnetId: data.privateOneSubnetId,
      privateTwoSubnetId: data.privateTwoSubnetId,
      publicOneSubnetId: data.publicOneSubnetId,
      publicTwoSubnetId: data.publicTwoSubnetId,
      publicRouteTableId: data.publicRouteTableId,
      privateRouteTableId: data.privateRouteTableId,
      itgw: data.itgw,
      publicSubnetCidr: data.publicSubnetCidr,
      privateSubnetCidr: data.privateSubnetCidr,
      infraSubnetCidr: data.infraSubnetCidr,
      eip: data.eip,
      natgwID: data.natgw,
      eksArn: data.eksArn,
    },
    function (err, info) {
      if (err) {
        logger.log.error("Error occurred while inserting to the database");
      } else {
        logger.log.info("Data have been inserted into the database.");
      }
    }
  );
  return result;
}

async function findData(name) {
  const db = await MongoClient.connect(uri);
  var dbo = db.db(database);
  const result = await dbo.collection("vpcs").findOne({ Vpc_name: name });
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
