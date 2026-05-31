import { Request } from "express";

export interface RequestAccount extends Request {
  adminId?: String
}