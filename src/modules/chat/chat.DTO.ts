import { Server } from "socket.io";
import { IAuthSocket } from "../gateway/gatewayInterface.js";
import * as ChatValidate from "./chat.validate.js";
import z from "zod";

export interface IMainDTO {
    socket: IAuthSocket;
    cb?: (response: string) => void;
    io?: Server;
}
export interface ISendMessageDTO extends IMainDTO {
    content: string;
    sendTo: string;
}
export interface CreateMessageDTO extends IMainDTO {
    message: string;
}

export type getChatParamsDTO = z.infer<typeof ChatValidate.getChatValidate.params>;