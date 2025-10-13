import { Request, Response } from "express";
import { DeleteAccountDTO, FreezeAccountBodyDTO, FreezeAccountParamsDTO, logoutDTO, resetPasswordCodeDTO, resetPasswordDTO, UnFreezeAccountDTO } from "./user.DTO.js";
import { LogoutEnum, revokeToken } from "../../utils/security/token.security.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import UserModel, { IUser, providerEnum, RoleEnum } from "../../DB/model/User.model.js";
import { Types, UpdateQuery } from "mongoose";
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
import PostModel from "../../DB/model/Post.model.js";
import { PostRepository } from "../../DB/repository/post.repository.js";
import { FriendRequestRepository } from "../../DB/repository/friendRequest.repository.js";
import FriendRequestModel from "../../DB/model/FriendRequest.model.js";


class userService {
    private userModel = new UserRepository(UserModel);
    private postModel = new PostRepository(PostModel);
    private friendRequestModel = new FriendRequestRepository(FriendRequestModel);

    constructor() { }
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles user profile retrieval
     * @example (req: Request, res: Response)
     * return {message: 'user profile', statusCode: 200, data: {user: req.user}}
     * @returns - Promise<Response>
     * @throws {BadRequestException} - If user is not authenticated
     * @example (req: Request, res: Response): Promise<Response>
     */
    profile = async (req: Request, res: Response): Promise<Response> => {
        if (!req.user) {
            throw new BadRequestException('User not authenticated');
        }
        return SuccessResponse<IUserSuccess>({ res, message: "user profile", data: { user: req.user } });
    }
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles user profile retrieval by userId
     * @example (req: Request, res: Response)
     * return {message: 'user profile', statusCode: 200, data: {user: user}}
     * @returns - Promise<Response>
     * @throws {NotFoundException} - If user is not found or blocked by the requester
     * @example (req: Request, res: Response): Promise<Response>
     */
    getProfile = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId?: Types.ObjectId };
        const user = await this.userModel.findOne({ filter: { _id: userId, blockedUsers: { $ne: req.user?._id } },select: '-password -resetPasswordOtp -otpExpire -changeCredentialsTime -confirmedEmailOtp -confirmedAt -provider -updatedAt -__v' });
        if (!user) {
            throw new NotFoundException('User not found or blocked you');
        }
        return SuccessResponse<IUserSuccess>({ res, message: "user profile", data: { user } });
    }

    /**
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles user logout
     * @example ({ flag }: logoutDTO)
     * return {message: 'success Logout', statusCode: 200}
     * @returns - Promise<Response>
     * @throws {BadRequestException} - If user is not authenticated
     * @throws {ForbiddenException} - If the user is not an admin and tries to logout all users
     * @example ({ flag }: logoutDTO): Promise<Response>
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
     * @returns - Promise<Response>
     * @throws {NotFoundException} - If user is not found or email is not verified
     * @throws {BadRequestException} - If the reset password code sending fails
     * @example ({ email }: resetPasswordCodeDTO): Promise<Response>
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
     * @returns - Promise<Response>
     * @throws {NotFoundException} - If user is not found or email is not verified
     * @throws {NotFoundException} - If OTP is invalid or expired
     * @throws {BadRequestException} - If password reset fails
     * @example ({ email, otp, newPassword }: resetPasswordDTO): Promise<Response>
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
    /**
     * 
     * @param req - Express Request
     * @param res - Express Response
     * @returns - Promise<Response>
     * @description - This function handles upload user avatar
     * @example (req: Request, res: Response)
     * return {message: 'Avatar uploaded successfully', statusCode: 200, data: {url: avatarUrl}}
     * @returns - Promise<Response>
     * @throws {BadRequestException} - If file is not found
     * @throws {BadRequestException} - If the avatar upload fails
     * @example (req: Request, res: Response): Promise<Response>
     */
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
     * @returns - Promise<Response>
     * @throws {BadRequestException} - If files are not found or empty
     * @throws {BadRequestException} - If the cover image upload fails
     * @example (req: Request, res: Response): Promise<Response>
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
     * @returns - Promise<Response>
     * @throws {BadRequestException} - If originalname or contentType is not provided
     * @throws {BadRequestException} - If the pre-signed URL generation fails
     * @example ({ originalname, contentType }: { originalname: string, contentType: string }): Promise<Response>
     */
    getPreSignedUrl = async (req: Request, res: Response): Promise<Response> => {
        const { originalname, contentType } = req.body;
        if (!originalname || !contentType) {
            throw new BadRequestException('originalname and contentType are required');
        }

        const { url } = await AWS_PreSignedUrl({
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
     * @returns - Promise<Response>
     * @throws {ForbiddenException} - If the user is not an admin and tries to freeze another user's account
     * @throws {NotFoundException} - If the user is not found or account is already frozen
     * @throws {BadRequestException} - If the freeze operation fails
     */
    FreezeAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as FreezeAccountParamsDTO || {};
        const { reason } = req.body as FreezeAccountBodyDTO || {};
        if (userId && req.user?.role !== RoleEnum.admin) {
            throw new ForbiddenException('Only admins can freeze other accounts');
        }
        const user = await this.userModel.findOneAndUpdate({ filter: { _id: userId || req.user?._id, freezeAt: { $exists: false } }, update: { freezeAt: new Date(), freezeBy: req.user?._id, freezeReason: reason, changeCredentialsTime: new Date(), $unset: { restoredAt: 1, restoredBy: 1 } } });
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
     * @returns - Promise<Response>
     * @throws {ForbiddenException} - If the user is not an admin and tries to unfreeze another user's account
     * @throws {NotFoundException} - If the user is not found or account is not frozen or you are trying to unfreeze account frozen by Owner
     * @throws {BadRequestException} - If the unfreeze operation fails
     */
    UnFreezeAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as UnFreezeAccountDTO;
        if (userId && req.user?.role !== RoleEnum.admin) {
            throw new ForbiddenException('Only admins can unfreeze other accounts');
        }
        const user = await this.userModel.findOneAndUpdate({ filter: { _id: userId, freezeAt: { $exists: true }, freezeBy: { $ne: userId } }, update: { $unset: { freezeAt: 1, freezeBy: 1, freezeReason: 1 }, restoredAt: new Date(), restoredBy: req.user?._id, changeCredentialsTime: new Date() } });
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
     * @returns - Promise<Response>
     * @throws {ForbiddenException} - If the user is not an admin and tries to delete another user's account
     * @throws {NotFoundException} - If the user is not found
     * @throws {BadRequestException} - If the deletion fails
     * @throws {BadRequestException} - If the AWS folder deletion fails
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
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles dashboard data retrieval
     * @example (req: Request, res: Response)
     * return {message: 'dashboard data', statusCode: 200, data: {users: users, posts: posts}}
     * @returns - Promise<Response>
     * @throws {BadRequestException} - If the dashboard data retrieval fails
     * @throws {NotFoundException} - If no users or posts are found
     * @throws {ForbiddenException} - If the user does not have permission to access the dashboard
     */
    dashboard = async (req: Request, res: Response): Promise<Response> => {
        const result = await Promise.allSettled([
            this.userModel.find({ filter: {} }),
            this.postModel.find({ filter: {} }),
        ])
        return SuccessResponse({ res, message: "dashboard data", data: { users: result[0], posts: result[1] } });
    }
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles changing user role
     * @example (req: Request, res: Response)
     * return {message: 'Role changed successfully', statusCode: 200}
     * @returns - Promise<Response>
     * @throws {ForbiddenException} - If an admin tries to assign superAdmin role
     * @throws {NotFoundException} - If the user is not found or the role change is not allowed
     * @throws {BadRequestException} - If the role change fails due to invalid role or permissions
     */
    changeRole = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId: Types.ObjectId };
        const { role }: { role: RoleEnum } = req.body;
        let denyRoles: RoleEnum[] = [role, RoleEnum.superAdmin]
        if (req.user?.role === RoleEnum.admin) {
            denyRoles.push(RoleEnum.admin)
        }
        if (req.user?.role === RoleEnum.admin && role === RoleEnum.superAdmin) {
            throw new ForbiddenException('Admins cannot assign superAdmin role');
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: { _id: userId as Types.ObjectId, role: { $nin: denyRoles } },
            update: { role }
        })
        if (!user) {
            throw new NotFoundException('User not found or you are not allowed to change this role');
        }
        return SuccessResponse({ res, message: "Role changed successfully" });
    }
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles sending friend request
     * @example (req: Request, res: Response)
     * return {message: 'Friend request sent successfully', statusCode: 201}
     * @returns - Promise<Response>
     * @throws {BadRequestException} - If the user tries to send a friend request to themselves or if a request is already pending
     * @throws {NotFoundException} - If the user to whom the request is sent does not exist or has blocked the sender
     * @throws {BadRequestException} - If the friend request creation fails
     */
    sendFriendRequest = async (req: Request, res: Response): Promise<Response> => {
        const { toUserId } = req.params as unknown as { toUserId: Types.ObjectId };
        const senderId = req.user?._id as Types.ObjectId;
        if(senderId.equals(toUserId)) {
            throw new BadRequestException('Cannot send friend request to yourself');
        }
        const existingRequest = await this.friendRequestModel.findOne({
            filter: {
                $or: [
                    { sender: senderId, receiver: toUserId, status: 'pending' },
                    { sender: toUserId, receiver: senderId, status: 'pending' }
                ]
            }
        });
        if (existingRequest) {
            throw new BadRequestException('Friend request already sent and pending');
        }
        const user = await this.userModel.findOne({ filter: { _id: toUserId, blockedUsers: { $ne: senderId } } });
        if (!user) {
            throw new NotFoundException('User not found or cannot send friend request to this user');
        }
        const friendRequest = await this.friendRequestModel.create({
            data: [
                {
                    sender: req.user?._id as Types.ObjectId,
                    receiver: toUserId,
                }
            ]
        });
        if (!friendRequest || friendRequest.length === 0) {
            throw new BadRequestException('Failed to send friend request, try again later');
        }
        return SuccessResponse({ res, status: 201, message: 'Friend request sent successfully' });
    }
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles accepting friend request
     * @example (req: Request, res: Response)
     * return {message: 'Friend request accepted successfully', statusCode: 200}
     * @returns - Promise<Response>
     * @throws {NotFoundException} - If the friend request is not found or already responded to
     * @throws {BadRequestException} - If the acceptance fails
     */
    acceptRequest = async (req: Request, res: Response): Promise<Response> => {
        const { requestId } = req.params as unknown as { requestId: Types.ObjectId };
        const friendRequest = await this.friendRequestModel.findOneAndUpdate({
            filter: { _id: requestId, receiver: req.user?._id, status: 'pending', acceptedAt: { $exists: false } },
            update: { status: 'accepted', AcceptedAt: new Date() }
        });
        if (!friendRequest) {
            throw new NotFoundException('Friend request not found or already responded to');
        }
        const acceptFriend = await Promise.all([
            this.userModel.updateOne({ filter: { _id: friendRequest.sender }, update: { $addToSet: { friends: friendRequest.receiver } } }),
            this.userModel.updateOne({ filter: { _id: friendRequest.receiver }, update: { $addToSet: { friends: friendRequest.sender } } })
        ])
        if (!acceptFriend) {
            throw new BadRequestException('Failed to add friend, try again later');
        }
        return SuccessResponse({ res, message: 'Friend request accepted successfully' });
    }
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles rejecting friend request
     * @example (req: Request, res: Response)
     * return {message: 'Friend request rejected successfully', statusCode: 200}
     * @returns - Promise<Response>
     * @throws {NotFoundException} - If the friend request is not found or already responded to
     * @throws {BadRequestException} - If the rejection fails
     */
    rejectRequest = async (req: Request, res: Response): Promise<Response> => {
        const { requestId } = req.params as unknown as { requestId: Types.ObjectId };
        const friendRequest = await this.friendRequestModel.findOneAndDelete({
            filter: { _id: requestId, receiver: req.user?._id, status: 'pending', acceptedAt: { $exists: false } }
        });
        if (!friendRequest) {
            throw new NotFoundException('Friend request not found or already responded to');
        }
        return SuccessResponse({ res, message: 'Friend request rejected successfully' });
    }
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles removing a friend
     * @example (req: Request, res: Response)
     * return {message: 'Friend removed successfully', statusCode: 200}
     * @returns - Promise<Response>
     * @throws {NotFoundException} - If the friend is not found in the user's friends list
     * @throws {BadRequestException} - If the removal fails
     */
    removeFriend = async (req: Request, res: Response): Promise<Response> => {
        const { friendId } = req.params as unknown as { friendId: Types.ObjectId };
        const user = await this.userModel.findOne({ filter: { _id: friendId, friends: { $in: [req.user?._id] } } });
        if (!user) {
            throw new NotFoundException('Friend not found in your friends list');
        }
        const removeFriend = await Promise.all([
            this.userModel.updateOne({ filter: { _id: req.user?._id }, update: { $pull: { friends: friendId } } }),
            this.userModel.updateOne({ filter: { _id: friendId }, update: { $pull: { friends: req.user?._id } } })
        ])
        if (!removeFriend) {
            throw new BadRequestException('Failed to remove friend, try again later');
        }
        await this.friendRequestModel.deleteOne({filter:{$or: [{sender: req.user?._id, receiver: friendId}, {sender: friendId, receiver: req.user?._id}]}});
        return SuccessResponse({ res, message: 'Friend removed successfully' });
    }
    /**
     * 
     * @param req -Request
     * @param res -Response
     * @returns - Promise<Response>
     * @description - This function handles blocking a user
     * @example (req: Request, res: Response)
     * return {message: 'User blocked successfully', statusCode: 200}
     * @returns - Promise<Response>
     * @throws {BadRequestException} - If the user tries to block themselves
     * @throws {NotFoundException} - If the user is not found or already blocked
     */
    blockUser = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId: Types.ObjectId };
        const senderId = req.user?._id as Types.ObjectId;
        if(senderId.equals(userId)) {
            throw new BadRequestException('Cannot block yourself');
        }
        const isAlreadyBlocked  = await this.userModel.findOne({ filter: { _id: req.user?._id, blockedUsers: userId } });
        if (isAlreadyBlocked ) {
            throw new NotFoundException('User not found or already blocked');
        }
        await this.userModel.updateOne({ filter: { _id: req.user?._id }, update: { $addToSet: { blockedUsers: userId } } });
        return SuccessResponse({ res, message: 'User blocked successfully' });
    }
    /**
     * 
     * @param req - Request
     * @param res - Response
     * @returns - Promise<Response>
     * @description - This function handles unblocking a user
     * @example (req: Request, res: Response)
     * return {message: 'User unblocked successfully', statusCode: 200}
     * @throws {NotFoundException} - If user is not found or not blocked
     * @throws {BadRequestException} - If the unblocking fails
     * @example (req: Request, res: Response): Promise<Response>
     */
    unBlockUser = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId: Types.ObjectId };
        const isAlreadyBlocked = await this.userModel.findOne({ filter: { _id: req.user?._id, blockedUsers: userId } });
        if (!isAlreadyBlocked) {
            throw new NotFoundException('User not found or not blocked');
        }
        await this.userModel.updateOne({ filter: { _id: req.user?._id }, update: { $pull: { blockedUsers: userId } } });
        return SuccessResponse({ res, message: 'User unblocked successfully' });
    }
}



export default new userService();
