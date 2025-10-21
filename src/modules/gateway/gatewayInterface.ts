import { Socket } from "socket.io";
import { HUserDocument } from "../../DB/model/User.model.js";
import { JwtPayload } from "jsonwebtoken";

export interface IAuthSocket extends Socket {
    Credentials?: {
        user: Partial<HUserDocument>;
        decoded: JwtPayload;
    }
}