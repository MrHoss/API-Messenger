import makeWASocket, { BaileysEventMap, fetchLatestBaileysVersion, useMultiFileAuthState, UserFacingSocketConfig, WASocket } from "baileys";
import path from "path";
import fs from "fs";
import AppError from "../../errors/AppError";
import MAIN_LOGGER from "baileys/lib/Utils/logger";
import { logger } from "../../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { Boom } from "@hapi/boom";

export interface Session extends WASocket {
  id: string;
  qrCode?: string;
}

class BWhatsapp {
  private static instances: Map<string, BWhatsapp> = new Map();
  private static sessions: Map<string, Session> = new Map();

  private sessionId: string;
  private socketConfig?: Partial<UserFacingSocketConfig>;

  // Construtor modificado para criar e armazenar instâncias
  public constructor(sessionId?: string, socketConfig?: Partial<UserFacingSocketConfig>) {
    this.sessionId = sessionId || uuidv4();
    this.socketConfig = socketConfig;

    // Se a instância não existir, cria e armazena uma nova instância
    if (!BWhatsapp.instances.has(this.sessionId)) {
      BWhatsapp.instances.set(this.sessionId, this);
      logger.info(`Instance created for session ${this.sessionId}`);
    } else {
      throw new AppError(`Instance already exists for session ${this.sessionId}`);
    }
  }

  public static getInstance(sessionId: string): BWhatsapp | null {
    return BWhatsapp.instances.get(sessionId) ?? null;
  }

  public static listSessions(): { id: string; qrCode?: string }[] {
    return Array.from(BWhatsapp.sessions.values()).map(session => ({
      id: session.id,
      qrCode: session.qrCode
    }));
  }


  public static async startStoredSessions(handler?: (events: Partial<BaileysEventMap>) => void | Promise<void>): Promise<void> {
    const authsPath = path.resolve(__dirname, ".auth");

    try {
      const files = fs.readdirSync(authsPath, { withFileTypes: true });
      const directories = files
        .filter(file => file.isDirectory())
        .map(dirent => dirent.name);

      const startPromises = directories.map(dirname => {
        const instance = new BWhatsapp(dirname);
        return instance.initSocket(handler);
      });

      await Promise.all(startPromises);
      logger.info("All sessions have been started.");
    } catch (err) {
      logger.error("Failed to start all sessions from files", err);
      throw new AppError("Failed to start all sessions from files", 500);
    }
  }

  public async initSocket(handler?: (events: Partial<BaileysEventMap>) => void | Promise<void>): Promise<Session> {
    return new Promise((resolve, reject) => {
      try {
        (async () => {
          logger.info("Connecting");
          const { state } = await useMultiFileAuthState(BWhatsapp.authPath(this.sessionId));
          const { version, isLatest } = await fetchLatestBaileysVersion();
          const socketConfig = {
            printQRInTerminal: false,
            auth: state,
            logger: MAIN_LOGGER.child({}),
            version,
            ...this.socketConfig
          };
          logger.info(`Session ${this.sessionId} started, using WA v${socketConfig.version.join('.')}, isLatest: ${isLatest}`);
          const socket: Session = {
            id: this.sessionId,
            ...makeWASocket(socketConfig)
          };

          if (!BWhatsapp.sessions.has(this.sessionId)) {
            BWhatsapp.sessions.set(this.sessionId, socket);
          }
          logger.info(`Socket created ${socket.id}`);
          resolve(socket);
          this.initMonitor(handler);
        })();
      } catch (err) {
        logger.error((err as Error).message);
        reject(err);
      }
    });
  }

  private async initMonitor(handler?: (events: Partial<BaileysEventMap>) => void | Promise<void>) {
    const socket = this.getSocket();
    if (socket) {
      const { saveCreds } = await useMultiFileAuthState(BWhatsapp.authPath(this.sessionId));
      socket.ev.process(async (events) => {
        if (events["connection.update"]) {
          const { connection, lastDisconnect, qr } = events["connection.update"];
          const disconnect = lastDisconnect ? (lastDisconnect.error as Boom).output.statusCode : undefined;
          if (connection === "connecting") {
            logger.info(`Connecting session ${this.sessionId}.`);
          } else if (connection === "open") {
            logger.info(`Session ${this.sessionId} connected`);
          } else if (connection === "close") {
            if (disconnect) {
              logger.info(`Session closed. Exit code: ${disconnect}`);
            }
          }
          if (qr) {
            logger.info(`Session ${this.sessionId} QRCode generated`);
            socket.qrCode = qr;
          }
        } else if (events["creds.update"]) {
          logger.info("Auth credentials updated");
          saveCreds();
        } else {
          if (handler) {
            handler(events);
          }
        }
      });
    }
  }

  public getSocket(): Session {
    const session = BWhatsapp.sessions.get(this.sessionId);
    if (!session) {
      throw new AppError(`Inexistent session Id "${this.sessionId}"`);
    }
    return session;
  }

  public removeSocket(clearAuth: boolean): void {
    try {
      if (BWhatsapp.sessions.has(this.sessionId)) {
        const session = BWhatsapp.sessions.get(this.sessionId)!;
        session.logout(); // Presumindo que logout é uma operação síncrona
        session.ws.close();
        BWhatsapp.sessions.delete(this.sessionId);
        logger.warn(`Clearing session ${this.sessionId} from memory`);
      }
      if (clearAuth) {
        try {
          fs.accessSync(BWhatsapp.authPath(this.sessionId)); // Verifica se o caminho existe
          logger.info(`Clearing auth data from session "${this.sessionId}"`);
          fs.rmSync(BWhatsapp.authPath(this.sessionId), { recursive: true });
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            logger.warn(`Auth credentials not found for session "${this.sessionId}"`);
          } else {
            logger.warn(`Error accessing or removing auth path. Err: ${(err as Error).message}`);
          }
        }
      } else {
        throw new AppError("Session not found", 404);
      }
    } catch (err) {
      throw new AppError((err as Error).message);
    }
  }

  private static authPath = (sessionId: string) => path.resolve(__dirname, ".auth", sessionId);
}

export default BWhatsapp;
