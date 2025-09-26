import { Request, Response } from "express";
import { logoutDTO } from "./user.DTO.js";
import { LogoutEnum } from "../../utils/security/token.security.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import UserModel, { IUser } from "../../DB/model/User.model.js";
import { TokenRepository } from "../../DB/repository/token.repository.js";
import TokenModel from "../../DB/model/Token.model.js";
import { UpdateQuery } from "mongoose";


class userService {
    private userModel = new UserRepository(UserModel);
    private tokenModel = new TokenRepository(TokenModel);

    constructor() { }
    profile = async (req: Request, res: Response): Promise<Response> => {
        return res.json({ message: "user profile", user: req.user, decoded: req.decoded })
    }

    /**
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles user logout
     * @example ({ flag }: logoutDTO)
     * return {message: 'user logout', statusCode: 200}
     */
    logout = async (req: Request, res: Response): Promise<Response> => {
        const { flag }: logoutDTO = req.body;
        const update: UpdateQuery<IUser> = {}
        let statusCode: number = 200;
        switch (flag) {
            case LogoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;

            default:
                await this.tokenModel.create({
                    data: [{
                        jti: req.decoded?.jti as string,
                        expiresIn: req.decoded?.iat as number + Number(process.env.JWT_EXPIRES_IN_REFRESH),
                        userId: req.decoded?.id
                    }]
                })
                statusCode = 201;
                break;
        }
        await this.userModel.updateOne({ filter: { _id: req.decoded?.id }, update });
        return res.status(statusCode).json({
            message: "user logout", data: {
                user: req.user?._id,
                decoded: req.decoded?.iat
            }
        })
    }
}

export default new userService();
