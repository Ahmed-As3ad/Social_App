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
import authController from './modules/auth/auth.controller';
import { handleError } from './utils/response/error.response.js';
import connectDb from './DB/connect.db.js';

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
    app.use(express.json(), cors(), helmet(), limiter);

    // DB
    await connectDb()

    // landing page route
    app.get('/', (req: Request, res: Response) => {
        res.json({ message: `welcome to ${process.env.APPLICATION_NAME} backend landing page❤️` });
    });

    // routes
    app.use('/api/auth', authController);

    // handle invalid routes
    app.use('{/*dummy}', (req: Request, res: Response) => {
        res.json({
            message: `route not found, please check the api documentation at ${process.env.APPLICATION_NAME} docs ❌`
        });
    });
// global error handler
app.use(handleError);

    app.listen(port, () => {
        console.log(`app is running at http://localhost:${port}🎉`);
    });
}

export default bootstrap;