import { Server } from "socket.io";
import { IAuthSocket } from "../gateway/gatewayInterface.js";
import { ChatService } from "./chat.service.js";

export class ChatEvents {
    private chatService: ChatService = new ChatService();
    constructor() { }
    sayHi = (socket: IAuthSocket, io: Server) => {
        socket.on('message', (data, cb) => {
            this.chatService.createMessage({ message: data, socket, cb, io });
        });
    }

    sendMessage = (socket: IAuthSocket, io: Server) => {
            socket.on('sendMessage', (data: { content: string, sendTo: string }) => {
               return this.chatService.sendMessage({ ...data, socket, io });
            });
        }
}
