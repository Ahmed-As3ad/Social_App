import { Request, Response } from "express";
import { DeleteAccountDTO, FreezeAccountBodyDTO, FreezeAccountParamsDTO, logoutDTO, resetPasswordCodeDTO, resetPasswordDTO, UnFreezeAccountDTO } from "./user.DTO.js";
import { LogoutEnum, revokeToken } from "../../utils/security/token.security.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import UserModel, { IUser, providerEnum, RoleEnum } from "../../DB/model/User.model.js";
import { UpdateQuery } from "mongoose";
import { JwtPayload } from "jsonwebtoken";
import { BadRequestException, ForbiddenException, NotFoundException } from "../../utils/response/error.response.js";
import { generateOtp } from "../../utils/Email/Otp.js";
import { html } from "../../utils/Email/email.template.js";
import { emailEvent } from "../../utils/events/email.event.js";
import { compareData, hashData } from "../../utils/security/hash.utils.js";
import { AWS_DeleteFiles, AWS_PreSignedUrl, AWS_ReadFiles, AWS_UploadFiles } from "../../utils/multer/s3.config.js";
import { AWSEvent } from "../../utils/events/s3events.js";
import { SuccessResponse } from "../../utils/response/success.response.js";
import { IgetPreSignedUrl, IUserSuccess } from "./user.entities.js";


class userService {
    private userModel = new UserRepository(UserModel);

    constructor() { }
    profile = async (req: Request, res: Response): Promise<Response> => {
        if (!req.user) {
            throw new BadRequestException('User not authenticated');
        }
        return SuccessResponse<IUserSuccess>({ res, message: "user profile", data: { user: req.user } });
    }

    /**
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles user logout
     * @example ({ flag }: logoutDTO)
     * return {message: 'success Logout', statusCode: 200}
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
        if (!req.user) {
            throw new BadRequestException('User not authenticated');
        }
        return SuccessResponse<IUserSuccess>({ res, message: "success Logout", data: { user: req.user }, status: statusCode });
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
        return SuccessResponse({ res, message: "Reset password code sent successfully" });
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
        const { email, otp, newPassword }: resetPasswordDTO = req.body;
        const user = await this.userModel.findOne({ filter: { email, provider: providerEnum.system, confirmedAt: { $exists: true } } });
        if (!user) {
            throw new NotFoundException('User not found or email not verified');
        }
        if (! await compareData(otp, user.resetPasswordOtp)) {
            throw new NotFoundException('Invalid OTP');
        }
        if (user.otpExpire && new Date() > user.otpExpire) {
            throw new NotFoundException('OTP has expired, please request a new one');
        }
        await this.userModel.updateOne({ filter: { _id: user._id }, update: { password: await hashData(newPassword), $unset: { resetPasswordOtp: 1, otpExpire: 1 }, changeCredentialsTime: new Date() } });
        return SuccessResponse({ res, message: "Password reset successfully" });
    }

    uploadAvatar = async (req: Request, res: Response): Promise<Response> => {
        // if (!req.file) {
        //     throw new BadRequestException('File not found');
        // }
        // const avatarUrl = await AWS_upload({
        //     file: req.file,
        //     path: `avatars/${req.user?._id}`,
        // })
        // await this.userModel.updateOne({ filter: { _id: req.user?._id }, update: { avatar: avatarUrl } });
        const { originalname, contentType } = req.body;
        const { url, Key } = await AWS_PreSignedUrl({
            Bucket: process.env.AWS_BUCKET_NAME as string,
            originalname,
            path: `avatars/${req.user?._id}`,
            contentType
        });
        if (!url) throw new BadRequestException('Failed to generate pre-signed URL');
        if (!req.user) throw new BadRequestException('User not authenticated');
        const user = await this.userModel.findByIdAndUpdate({ id: req.user._id, update: { tempAvatar: req.user.avatar, avatar: Key } });
        if (!user) throw new NotFoundException('User not found');
        AWSEvent.emit('checkFileExists', { data: { Key, url, id: req.user._id }, expiresIn: Number(process.env.AWS_EXPIRES_IN) });
        return SuccessResponse<IgetPreSignedUrl>({ res, message: 'Avatar uploaded successfully', data: { url } });
    }
    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles upload multiple cover images
     * @example (req: Request, res: Response)
     * return {message: 'Covers uploaded successfully', statusCode: 200}
     */
    uploadCovers = async (req: Request, res: Response): Promise<Response> => {
        if (!req.files || req.files.length === 0) {
            throw new BadRequestException('Files not found');
        }
        const coversUrl = await AWS_UploadFiles({
            files: req.files as Express.Multer.File[],
            path: `avatars/${req.user?._id}/covers`,
            useLargeFiles: true
        })
        await this.userModel.updateOne({ filter: { _id: req.user?._id }, update: { covers: coversUrl } });
        return SuccessResponse({ res, message: 'Covers uploaded successfully' });
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles generate pre-signed URL for uploading files
     * @example ({ originalname, contentType }: { originalname: string, contentType: string })
     * return {message: 'Pre-signed URL generated successfully', statusCode: 200}
     */
    getPreSignedUrl = async (req: Request, res: Response): Promise<Response> => {
        const { originalname, contentType } = req.body;
        if (!originalname || !contentType) {
            throw new BadRequestException('originalname and contentType are required');
        }

        const {url} = await AWS_PreSignedUrl({
            Bucket: process.env.AWS_BUCKET_NAME as string,
            originalname,
            contentType,
            path: `avatars/${req.user?._id}/covers`,
        });
        return SuccessResponse<IgetPreSignedUrl>({ res, message: 'Pre-signed URL generated successfully', data: { url } });
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles freeze user account
     * @example ({ userId }: FreezeAccountParamsDTO, { reason }: FreezeAccountBodyDTO)
     * return {message: 'Account frozen successfully', statusCode: 200}
     */
    FreezeAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as FreezeAccountParamsDTO || {};
        const { reason } = req.body as FreezeAccountBodyDTO || {};
        if (userId && req.user?.role !== RoleEnum.admin) {
            throw new ForbiddenException('Only admins can freeze other accounts');
        }
        const user = await this.userModel.findAndUpdate({ filter: { _id: userId || req.user?._id, freezeAt: { $exists: false } }, update: { freezeAt: new Date(), freezeBy: req.user?._id, freezeReason: reason, changeCredentialsTime: new Date(), $unset: { restoredAt: 1, restoredBy: 1 } } });
        if (!user) {
            throw new NotFoundException('User not found or account is already frozen');
        }
        return SuccessResponse({ res, message: "Account frozen successfully" });
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles unfreeze user account
     * @example ({ userId }: UnFreezeAccountDTO)
     * return {message: 'Account unfrozen successfully', statusCode: 200}
     */
    UnFreezeAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as UnFreezeAccountDTO;
        if (userId && req.user?.role !== RoleEnum.admin) {
            throw new ForbiddenException('Only admins can unfreeze other accounts');
        }
        const user = await this.userModel.findAndUpdate({ filter: { _id: userId, freezeAt: { $exists: true }, freezeBy: { $ne: userId } }, update: { $unset: { freezeAt: 1, freezeBy: 1, freezeReason: 1 }, restoredAt: new Date(), restoredBy: req.user?._id, changeCredentialsTime: new Date() } });
        if (!user) {
            throw new NotFoundException('User not found or account is not frozen or you are trying to unfreeze account frozen by Owner');
        }

        return SuccessResponse({ res, message: "Account unfrozen successfully" });
    }

    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles hard delete user account
     * @example ({ userId }: DeleteAccountDTO)
     * return {message: 'Account deleted successfully', statusCode: 200}
     */
    deleteHardAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as DeleteAccountDTO || {};
        const targetUserId = userId || req.user?._id;

        if (userId && req.user?.role !== RoleEnum.admin) {
            throw new ForbiddenException('Only admins can delete other accounts');
        }

        const existingUser = await this.userModel.findOne({ filter: { _id: targetUserId } });
        if (!existingUser) {
            throw new NotFoundException('User not found');
        }

        try {
            const readFiles = await AWS_ReadFiles({ path: `avatars/${existingUser._id}` });
            if (!readFiles.Contents?.length) {
                console.log(`No files found in AWS folder for user: ${existingUser._id}`);
            }
            const urls: string[] = readFiles.Contents?.map(file => { return file.Key as string }) || [];
            await AWS_DeleteFiles({ urls });
        } catch (Error) {
            throw new BadRequestException('Failed to delete AWS folder');
        }
        const deleteResult = await this.userModel.deleteOne({ filter: { _id: targetUserId } });
        if (deleteResult.deletedCount === 0) {
            throw new BadRequestException('Failed to delete account from database');
        }
        return SuccessResponse({ res, message: "Account deleted successfully" });
    }
}

export default new userService();
