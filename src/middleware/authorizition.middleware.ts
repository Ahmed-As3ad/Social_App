import { NextFunction, Request, Response } from "express"
import { BadRequestException, ForbiddenException } from "../utils/response/error.response.js"
import { RoleEnum } from "../DB/model/User.model.js"
import { decodedToken, TokenEnum } from "../utils/security/token.security.js"

export const authorization = (accessRoles: RoleEnum[] = [], tokenType: TokenEnum = TokenEnum.access) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.headers.authorization) {
            throw new BadRequestException('authorization header is required');
        }
        const { decoded, user } = await decodedToken({ authorization: req.headers.authorization, tokenType });
        req.user = user;
        req.decoded = decoded;

        if (!accessRoles.includes(user.role)) {
            throw new ForbiddenException('You are not allowed to access this resource');
        }
        next();

    }
}