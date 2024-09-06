import { Request, Response } from "express";
import BWhatsapp from "./bwa";
import AppError from "../../errors/AppError";
import { BaileysEventMap } from "baileys";

const handler = (events: Partial<BaileysEventMap>) => {
  console.log(events);
}

export const index = async (_req: Request, res: Response): Promise<Response> => {
  // Lista sessões ativas
  return res.status(200).json(BWhatsapp.listSessions());
}

export const store = async (_req: Request, res: Response): Promise<Response> => {
  const bwhatsapp = new BWhatsapp();
  const socket = await bwhatsapp.initSocket(handler);
  if (!socket) throw new AppError("Failed to create socket");

  return res.status(200).json({ message: "Session created", socketId: socket.id, qrCode: socket.qrCode });
}

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { sessionId } = req.params;
  const bwhatsapp = BWhatsapp.getInstance(sessionId);

  if (!bwhatsapp) throw new AppError("Session not found", 404);

  const socket = bwhatsapp.getSocket();
  return res.status(200).json({ socketId: socket.id, qrCode: socket.qrCode });
}

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { sessionId } = req.params;
  const bwhatsapp = BWhatsapp.getInstance(sessionId);

  if (!bwhatsapp) throw new AppError("Session not found", 404);

  bwhatsapp.removeSocket(true);
  return res.status(200).json({ message: "Session deleted", socketId: sessionId });
}
