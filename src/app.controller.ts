// env configuration
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve('./config/.env.development') });
// import express and types
import express from 'express';
import type { Express, Request, Response } from 'express';
// third party middlewares
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// import controllers
import { authRouter, userRouter, postRouter} from './modules';
import { BadRequestException, handleError } from './utils/response/error.response';
import connectDb from './DB/connect.db.js';
import { AWS_GetFileStream } from './utils/multer/s3.config.js';
import { promisify } from 'node:util'
import { pipeline } from 'node:stream';

const pipe = promisify(pipeline);
// initialize rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    statusCode: 429, // 429 status = Too Many Requests
});

// bootstrap function to start the server
const bootstrap = async (): Promise<void> => {
    const app: Express = express();
    const port: number | string = process.env.PORT || 5000;
    app.use(express.json());
    app.use(cors(), helmet(), limiter);

    // DB
    await connectDb()

    // landing page route
    app.get('/', (req: Request, res: Response) => {
        res.json({ message: `welcome to ${process.env.APPLICATION_NAME} backend landing page❤️` });
    });

    //Get file streaming from s3
    app.get('/upload/*path', async (req: Request, res: Response): Promise<void> => {
        const { downloadName, download = 'false' } = req.query as { downloadName?: string, download?: string };
        const { path } = req.params as unknown as { path: string[] };
        const Key = path.join('/');
        const fileStream = await AWS_GetFileStream({ key: Key });
        if (!fileStream || !fileStream.Body) {
            new BadRequestException('file not found');
        }
        res.setHeader('Content-Type', fileStream.ContentType || 'application/octet-stream');
        if (download === 'true') {
            res.setHeader('Content-Disposition', `attachment; filename="${downloadName || Key.split('/').pop()}"`);
        }
        return await pipe(fileStream?.Body as NodeJS.ReadableStream, res);
    });

    // routes
    app.use('/api/auth', authRouter);
    app.use('/api/user', userRouter);
    app.use('/api/post', postRouter);

    // handle invalid routes
    app.use('{/*dummy}', (req: Request, res: Response) => {
        res.json({
            message: `route not found, please check the api documentation at ${process.env.APPLICATION_NAME} docs ❌`
        });
    });
    // global error handler
    app.use(handleError);

    // async function test() {
    //     // try {
    //     //     const user = await new UserModel({
    //     //         fullName: 'John Doe',
    //     //         email: 'anaahmee48@gmail.com',
    //     //         password: 'securePassword123',
    //     //         DOB: '1990-01-01'
    //     //     }).save();
    //     //     console.log('User created:', user);
    //     //     console.log('Full Name:', user.fullName);
    //     // } catch (error) {
    //     //     console.error('Error creating user:', error);
    //     // }
    //     const userModel = new UserRepository(UserModel);
    //     const user = await userModel.findAndUpdate({ filter: { _id: "68d1d6e14f3217d0c2cd7957" as unknown as Types.ObjectId }, update: { freezeAt: new Date() } });
    //     console.log({ result: user });

    // }
    // // test();

    app.listen(port, () => {
        console.log(`app is running at http://localhost:${port}🎉`);
    });
}

export default bootstrap;