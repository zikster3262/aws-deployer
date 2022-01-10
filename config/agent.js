const https = require("https");

const agent = new https.Agent({
  maxSockets: 25,
});

module.exports = {
  agent,
};
