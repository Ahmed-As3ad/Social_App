import { Server as httpServer } from 'node:http'
import { Server } from 'socket.io'
import { decodedToken, TokenEnum } from '../../utils/security/token.security.js';
import { BadRequestException } from '../../utils/response/error.response.js';
import { IAuthSocket } from './gatewayInterface.js';
import { ChatGateway } from '../chat/chat.gateway.js';


export const connectedUsers = new Map<string, string[]>();
let io: undefined | Server = undefined
export const initializeGateway = (server: httpServer) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.use(async (socket: IAuthSocket, next) => {
        try {
            // console.log(socket?.handshake?.auth?.authorization);

            const { user, decoded } = await decodedToken({ authorization: socket?.handshake?.auth?.authorization, tokenType: TokenEnum.access });
            socket.Credentials = { user, decoded };
            const userTapes = connectedUsers.get(user._id.toString()) || [];
            userTapes.push(socket.id);
            connectedUsers.set(user._id.toString(), userTapes);
            console.log(connectedUsers);

            next();
        } catch (error: any) {
            next(new BadRequestException(error || 'Authentication error'));
        }
    });

    function disconnectSocket(socket: IAuthSocket) {
        return socket.on('disconnect', () => {
            const userId = socket?.Credentials?.user?._id?.toString() || '';
            let remainingTapes = (connectedUsers.get(userId) || []).filter(tape => tape !== socket.id);
            if (remainingTapes.length) {
                connectedUsers.set(userId, remainingTapes);
            } else {
                getIO().emit('offline_user', { userId, status: 'offline' });
                connectedUsers.delete(userId);
            }
            console.log({ connectedUsers });

            console.log('Client disconnected:', socket.id);
        });
    }

    const chatGateway: ChatGateway = new ChatGateway();

    io.on('connection', (socket: IAuthSocket) => {
        console.log('New client connected:', socket?.Credentials?.user?._id?.toString() || '');

        socket.emit('message', 'Welcome to the WebSocket server!');

        chatGateway.register(socket, getIO());

        socket.emit('products', { name: 'Iphone', price: 1000 }, (res: string) => {
            console.log(res);
        });

        disconnectSocket(socket);

    });
}
export const getIO = (): Server => {
    if (!io) {
        throw new BadRequestException('Socket.io not initialized');
    }
    return io;
}