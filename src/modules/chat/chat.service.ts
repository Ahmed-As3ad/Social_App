import { Request, Response } from "express";
import { CreateMessageDTO, getChatParamsDTO, ISendMessageDTO } from "./chat.DTO.js";
import { SuccessResponse } from "../../utils/response/success.response.js";
import { ChatRepository } from "../../DB/repository/chat.repository.js";
import chatModel from "../../DB/model/Chat.model.js";
import { Types } from "mongoose";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response.js";
import { IGetChatResponse } from "./chat.entities.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import UserModel from "../../DB/model/User.model.js";
import { connectedUsers } from "../gateway/gateway.js";

export class ChatService {
    private chatModel: ChatRepository = new ChatRepository(chatModel);
    private userModel: UserRepository = new UserRepository(UserModel);
    constructor() { }
    getChat = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as getChatParamsDTO;
        console.log(`userId: ${userId}`);
        const chat = await this.chatModel.findOne({
            filter: {
                participants: { $all: [req?.user?._id as Types.ObjectId, Types.ObjectId.createFromHexString(userId)] },
                group: { $exists: false }
            },
            options: { populate: { path: 'participants', select: 'fullName avatar gender email' } }
        })
        if (!chat) {
            throw new BadRequestException('Chat not found between the users');
        }
        return SuccessResponse<IGetChatResponse>({ res, message: "Chat retrieved successfully", data: { chat } });
    }
    createMessage = ({ message, socket, cb }: CreateMessageDTO) => {
        try {
            console.log(`Message from client (${socket.id}):`, message);
            return cb?.(`Server received your message: ${message}`);
        } catch (error) {
            return socket.emit('custom_error', { message: 'Fail creating message', details: error });
        }
    }

    sendMessage = async ({ content, sendTo, socket, io }: ISendMessageDTO) => {
        try {
            const senderId = socket?.Credentials?.user?._id;
            const user = await this.userModel.findOne({
                filter: { _id: sendTo, group: { $exists: false }, blockedUsers: { $ne: senderId } }
            })
            if (!user) {
                throw new NotFoundException('User not found');
            }
            const chat = await this.chatModel.findOneAndUpdate({
                filter: { participants: { $all: [senderId as Types.ObjectId, Types.ObjectId.createFromHexString(sendTo)] }, group: { $exists: false } },
                update: { $addToSet: { messages: { content, sender: senderId } } }
            })
            if (!chat) {
                const newChat = await this.chatModel.create({
                    data: [{ participants: [senderId as Types.ObjectId, Types.ObjectId.createFromHexString(sendTo)], messages: [{ content, sender: senderId as Types.ObjectId }] }]
                })
                if (!newChat) {
                    throw new BadRequestException('Failed to create new chat');
                }
            }
            io?.to(connectedUsers.get(senderId?.toString() as string) as string[]).emit('successMessage', { content, senderAvatar: socket?.Credentials?.user?.avatar})
            io?.to(connectedUsers.get(sendTo?.toString() as string) as string[]).emit('newMessage', { content, from: socket?.Credentials?.user})
            console.log({senderAvatar: socket?.Credentials?.user?.avatar});
            
        } catch (error) {
            console.log(error);

            // return socket.emit('custom_error', { message: 'Fail sending message', details: error });
        }
    }
}
export const chatService = new ChatService();