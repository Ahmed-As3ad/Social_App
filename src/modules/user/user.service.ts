import { Request, Response } from "express";
import { logoutDTO, resetPasswordCodeDTO, resetPasswordDTO } from "./user.DTO.js";
import { LogoutEnum, revokeToken } from "../../utils/security/token.security.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import UserModel, { IUser, providerEnum } from "../../DB/model/User.model.js";
import { UpdateQuery } from "mongoose";
import { JwtPayload } from "jsonwebtoken";
import { NotFoundException } from "../../utils/response/error.response.js";
import { generateOtp } from "../../utils/Email/Otp.js";
import { html } from "../../utils/Email/email.template.js";
import { emailEvent } from "../../utils/events/email.event.js";
import { compareData, hashData } from "../../utils/security/hash.utils.js";


class userService {
    private userModel = new UserRepository(UserModel);
    // private tokenModel = new TokenRepository(TokenModel);

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
                await revokeToken(req?.decoded as JwtPayload);
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

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles reset password code sending
     * @example ({ email }: resetPasswordCodeDTO)
     * return {message: 'Reset password code sent successfully', statusCode: 200}
     */
    resetPasswordCode = async (req: Request, res: Response): Promise<Response> => {
        const { email }: resetPasswordCodeDTO = req.body;
        const user = await this.userModel.findOne({ filter: { email, provider: providerEnum.system, confirmedAt: { $exists: true } } });
        if (!user) {
            throw new NotFoundException('User not found or email not verified');
        }
        const otp = await generateOtp();
        await this.userModel.updateOne({ filter: { _id: user._id }, update: { resetPasswordOtp: await hashData(String(otp)), otpExpire: new Date(Date.now() + 3 * 60 * 1000) } });
        emailEvent.emit('sendEmail', { to: email, subject: 'Reset your password', html: html(user.firstName, otp) });
        return res.json({ message: "Reset password code sent successfully" })
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles reset password verification
     * @example ({ email, otp, newPassword }: resetPasswordDTO)
     * return {message: 'Password reset successfully', statusCode: 200}
     */
    resetPasswordVerify = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp, newPassword}: resetPasswordDTO = req.body;
        const user = await this.userModel.findOne({ filter: { email, provider: providerEnum.system, confirmedAt: { $exists: true } } });
        if (!user) {
            throw new NotFoundException('User not found or email not verified');
        }
        if(! await compareData(otp, user.resetPasswordOtp)){
            throw new NotFoundException('Invalid OTP');
        }
        if(user.otpExpire && new Date() > user.otpExpire){
            throw new NotFoundException('OTP has expired, please request a new one');
        }
        await this.userModel.updateOne({ filter: { _id: user._id }, update: { password: await hashData(newPassword), $unset: { resetPasswordOtp: 1, otpExpire: 1 }, changeCredentialsTime: new Date() } });
        return res.json({ message: "Password reset successfully" })
    }
}

export default new userService();
