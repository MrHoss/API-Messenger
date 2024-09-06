import "express-async-errors";
import express, { NextFunction, Request, Response } from 'express';
import router from './router';
import AppError from "./errors/AppError";
import { logger } from "./utils/logger";
import BWhatsapp from "./modules/bwhatsapp/bwa";
import { serverConfig } from "./settings";


const app = express();

const { port,
  // hostname,
  // corsConfig
} = serverConfig;

app.use(router);
app.use(async (err: Error, _req: Request, res: Response, _next: NextFunction): Promise<Response> => {
  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message, content: err?.content });
  }

  logger.error(err);
  return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
});
app.listen(port, async () => {
  logger.info(`Server started on port: ${port}`);
  await BWhatsapp.startStoredSessions();
});

