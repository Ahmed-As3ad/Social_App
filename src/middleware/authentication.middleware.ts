import type { NextFunction, Request, Response } from "express";
import { BadRequestException } from "../utils/response/error.response.js";
import { decodedToken } from "../utils/security/token.security.js";

export const authentication = () => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.headers.authorization) {
            throw new BadRequestException('authorization header is required');
        }
        const { decoded, user } = await decodedToken({ authorization: req.headers.authorization });
        req.user = user;
        req.decoded = decoded;
        next();
    }
    
}