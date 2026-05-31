import { NextFunction, Request, Response } from "express";
import ChatRoom from "../../models/chat-room.model";

export const getChatMessageTotal = async (req: Request, res: Response, next: NextFunction) => {
  if(res.locals.accountUser) {
    // Lấy thông tin phòng chat
    const chatRoom = await ChatRoom.findOne({
      userId: res.locals.accountUser.id
    });
    if(chatRoom) {
      res.locals.chatMessageTotal = chatRoom.unreadCount?.user;
    }
  }
  next();
}