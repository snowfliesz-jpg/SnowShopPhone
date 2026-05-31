import { Socket } from "socket.io";
import * as cookie from 'cookie';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';

export const authSocket = (socket: Socket, next: any) => {
  try {
    const cookieString = socket.handshake.headers.cookie;
    if(cookieString) {
      const cookieParsed = cookie.parse(cookieString);
      // Debug logs to help trace socket auth issues
      console.log('[auth.socket] cookieParsed:', cookieParsed);
      console.log('[auth.socket] handshake.auth:', socket.handshake.auth);
      
      let token: string = "";
      let role: string = "";
      let roomId: string = "";

      if(cookieParsed.tokenAdmin) {
        token = cookieParsed.tokenAdmin;
        role = "admin";
        // Chỉ gán roomId khi có giá trị hợp lệ (loại bỏ 'undefined'|'null' chuỗi)
        const rawRoom = socket.handshake?.auth?.roomId || socket.handshake?.query?.roomId;
        if (rawRoom && rawRoom !== 'undefined' && rawRoom !== 'null') {
          roomId = String(rawRoom).trim();
        } else {
          roomId = "";
        }
      } else if(cookieParsed.tokenUser) {
        token = cookieParsed.tokenUser;
        role = "user";
      }

      if(token && role) {
        const decoded = jwt.verify(token, `${process.env.JWT_SECRET}`) as JwtPayload;
        
        if(decoded && decoded.id && decoded.email) {
          socket.data.account = {
            id: decoded.id,
            email: decoded.email,
            role: role,
            roomId: roomId
          };
          console.log('[auth.socket] socket.data.account set:', socket.data.account);
        }
      }
    }
    next();
  } catch (error) {
    console.log(error);
  }
}