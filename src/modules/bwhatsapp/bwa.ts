import makeWASocket, { BaileysEventMap, fetchLatestBaileysVersion, useMultiFileAuthState, WASocket } from "baileys";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";
import AppError from "../../errors/AppError";
import MAIN_LOGGER from "baileys/lib/Utils/logger";
import { logger } from "../../utils/logger";
import { v4 as uuidv4 } from "uuid";


export interface Session extends WASocket {
    id: string;
    qrCode?: string;
}
const authPath = (sessionId: string) => path.resolve(__dirname, ".auth", sessionId);
const sessions: Session[] = [];
const loggerBaileys = MAIN_LOGGER.child({});
loggerBaileys.level = "silent";

export function listSockets() {
    return sessions.map((s) => ({ id: s.id, qrCode: s.qrCode }));
}

export async function startStoredSockets() {
    const authsPath = path.resolve(__dirname, '.auth');

    try {
        const files = fs.readdirSync(authsPath, { withFileTypes: true });

        const directories = files
            .filter(file => file.isDirectory())
            .map(dirent => dirent.name);

        for (const dirname of directories) {
            const bwhatsapp = new BWhatsapp(dirname);
            await bwhatsapp.initSocket();
            await bwhatsapp.initMonitor();
        }
    } catch (err) {
        console.error('Failed to start stored sockets', err);
    }
}

class BWhatsapp {
    private sessionId: string;

    constructor(sessionId?: string) {
        this.sessionId = sessionId || uuidv4();
        if (!sessionId) logger.info(`Undefined session ID, creating a new one ${this.sessionId}`)
    }

    public getSocket() {
        const sessionIndex = sessions.findIndex((session) => session.id === this.sessionId);
        if (sessionIndex === -1) {
            throw new AppError(`Inexistent session Id "${this.sessionId}"`);
        }
        return sessions[sessionIndex];
    }

    public async initSocket(handler?: (events: Partial<BaileysEventMap>) => void | Promise<void>): Promise<Session> {
        return new Promise((resolve, reject) => {
            try {
                (async () => {
                    logger.info("Connecting")
                    const { state } = await useMultiFileAuthState(authPath(this.sessionId));
                    const { version, isLatest } = await fetchLatestBaileysVersion();
                    logger.info(`Session ${this.sessionId} started, using WA v${version.join('.')}, isLatest: ${isLatest}`)

                    const socket: Session = {
                        id: this.sessionId,
                        ...makeWASocket({
                            printQRInTerminal: true,
                            auth: state,
                            logger: loggerBaileys
                        })
                    };

                    const sessionIndex = sessions.findIndex((session: Session) => session.id === this.sessionId);
                    if (sessionIndex === -1) {
                        sessions.push(socket);
                    }
                    loggerBaileys.info(`Socket created ${socket.id}`)
                    resolve(socket);
                    this.initMonitor(handler)
                })();
            } catch (err) {
                logger.error((err as Error).message);
                reject(err)
            }
        })
    }

    async initMonitor(handler?: (events: Partial<BaileysEventMap>) => void | Promise<void>) {
        const socket = this.getSocket();
        if (socket) {
            const { saveCreds } = await useMultiFileAuthState(authPath(this.sessionId));
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
                        logger.info(`Session ${this.sessionId} QRCode generate`);
                        socket.qrCode = qr;
                    }
                } else if (events["creds.update"]) {
                    logger.info("Auth credentials updated")
                    saveCreds;
                } else {
                    if (handler) {
                        handler(events);
                    }
                }
            });
        } else {
            return;
        }
    }
    public removeSocket(clearAuth: boolean) {
        try {
            const sessionIndex = sessions.findIndex((session) => session.id === this.sessionId);

            if (sessionIndex !== -1) {
                sessions[sessionIndex].logout();  // Presumindo que logout é uma operação síncrona
                sessions[sessionIndex].ws.close();
                sessions.splice(sessionIndex, 1);
                logger.warn(`Clearing session ${this.sessionId} from memory`);
            }
            if (clearAuth) {
                try {
                    fs.accessSync(authPath(this.sessionId));  // Verifica se o caminho existe
                    logger.info(`Clearing auth data from session "${this.sessionId}"`);
                    fs.rmSync(authPath(this.sessionId), { recursive: true });
                } catch (err) {
                    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
                        logger.warn(`Auth credentials not found for session "${this.sessionId}"`);
                    } else {
                        logger.warn(`Error accessing or removing auth path. Err: ${(err as Error).message}`);
                    }
                }
            }
            if(sessionIndex === -1){
                throw new AppError("Session not found", 404);
            }
            
            
        } catch (err) {
            throw new AppError((err as Error).message);
        }
    }
}
export default BWhatsapp;
