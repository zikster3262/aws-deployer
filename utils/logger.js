const logger = require("pino");
const dayjs = require("dayjs");
const pretty = require("pino-pretty");

const log = logger({
  prettyPrint: true,
  base: {
    pid: false,
  },
  timestamp: () => `."time":"${dayjs().format()}"`,
});

module.exports = { log };
