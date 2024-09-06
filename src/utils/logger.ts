import pino from "pino";
import pretty from "pino-pretty";

const logger = pino({}, pretty({
  ignore: "pid,hostname"
}));

export { logger };
