import { Request, Response } from "express";
import BWhatsapp, { listSockets } from "./bwa";
import AppError from "../../errors/AppError";
import { BaileysEventMap } from "baileys";

const handler = (events: Partial<BaileysEventMap>)=>{
    console.log(events);
}   

export const index =async (_req:Request,res:Response):Promise<Response>=>{
    return res.status(200).json(listSockets());
}

export const store = async (_req: Request, res: Response): Promise<Response> => {
    const socket = await new BWhatsapp().initSocket(handler);

    if(!socket) throw new AppError("Failed to create socket");

    return res.status(200).json({message:"Session created",socketId:socket.id, qrCode:socket.qrCode})
}

export const show = async (req: Request, res: Response): Promise<Response> => {
    const { sessionId } = req.params;
    const socket = new BWhatsapp(sessionId).getSocket();
    if (!socket) throw new AppError("Session not found",404);

    return res.status(200).json({ socketId: socket.id, qrCode:socket.qrCode })
}

export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { sessionId } = req.params;
    new BWhatsapp(sessionId).removeSocket(true);
    return res.status(200).json({ message: "Session deleted", socketId: sessionId })
}