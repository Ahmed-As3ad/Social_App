import { Request, Response } from "express";
import { PostRepository } from "../../DB/repository/post.repository.js";
import PostModel, { HPostDocument, likeActionEnum } from "../../DB/model/Post.model.js";
import { SuccessResponse } from "../../utils/response/success.response.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import UserModel from "../../DB/model/User.model.js";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response.js";
import { AWS_DeleteFiles, AWS_UploadFiles } from "../../utils/multer/s3.config.js";
import { v4 as uuid } from 'uuid'
import { likePostDTO } from "./post.DTO.js";
import { UpdateQuery } from "mongoose";


class PostService {
    private userModel = new UserRepository(UserModel);
    private postModel = new PostRepository(PostModel);
    constructor() { }

    /**
     * Create a new post
     * @param req - Express Request
     * @param res - Express Response
     * @throws - BadRequestException, NotFoundException
     * @description - Create a new post with optional attachments and tags. Validates tag users and uploads attachments to AWS S3.
     * @returns - SuccessResponse with post creation message and status 201 or error if post creation fails.
    */
    createPost = async (req: Request, res: Response): Promise<Response> => {
        if (req?.body?.tags?.length && ((await this.userModel.find({ filter: { _id: { $in: req.body.tags } } })).length !== req.body.tags.length)) {
            throw new NotFoundException('One or more tag users not found');
        }
        let attachments: string[] = [];
        let assetsFolderId = uuid();
        if (req.files?.length) {
            attachments = await AWS_UploadFiles({ files: req.files as Express.Multer.File[], path: `users/${req.user?._id}/posts/${assetsFolderId}` })
        }
        const post = await this.postModel.create({ data: { ...req.body, attachments, assetsFolderId, author: req.user?._id } });
        if (!post) {
            if (attachments.length) {
                await AWS_DeleteFiles({ urls: attachments });
            }
            throw new BadRequestException('Post not created, try again later');
        }
        return SuccessResponse({ res, status: 201, message: 'Post Created' })
    }

    /**
     * Like or unlike a post
     * @param req - Express Request
     * @param res - Express Response
     * @throws - NotFoundException
     * @description - Like or unlike a post based on the action specified in the query parameters.
     * @returns - SuccessResponse like or unlike message and status 200. or error if post not found or frozen.
     */
    likePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as { postId: string };
        const { action } = req.query as likePostDTO['query'];
        let update: UpdateQuery<HPostDocument> = { $addToSet: { likes: req.user?._id } }
        let messageL = 'Post liked';
        if (action === likeActionEnum.unlike) {
            update = { $pull: { likes: req.user?._id } }
            messageL = 'Post unliked';
        }
        const post = await this.postModel.findOneAndUpdate({ filter: { _id: postId }, update });
        if (!post) throw new NotFoundException('Post not found or Post Frozen');
        return SuccessResponse({ res, status: 200, message: messageL === 'Post liked' ? messageL : 'Post unliked' });
    };
}

export default new PostService();