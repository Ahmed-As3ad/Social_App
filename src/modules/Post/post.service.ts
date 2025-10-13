import { Request, Response } from "express";
import { PostRepository } from "../../DB/repository/post.repository.js";
import PostModel, { AvalilabilityEnum, HPostDocument, likeActionEnum } from "../../DB/model/Post.model.js";
import { SuccessResponse } from "../../utils/response/success.response.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import UserModel from "../../DB/model/User.model.js";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response.js";
import { AWS_DeleteFiles, AWS_UploadFiles } from "../../utils/multer/s3.config.js";
import { v4 as uuid } from 'uuid'
import { likePostDTO } from "./post.DTO.js";
import { Types, UpdateQuery } from "mongoose";
import { CommentRepository } from "../../DB/repository/comment.repository.js";
import CommentModel from "../../DB/model/Comment.model.js";


export const postAvailability = (req: Request) => {
    const userId = req.user?._id;
    const userFriends = req.user?.friends || [];

    return [
        { availability: AvalilabilityEnum.public },
        ...(userId ? [{ availability: AvalilabilityEnum.friends, author: { $in: [...userFriends, userId] } }] : []),
        ...(userId ? [{ availability: AvalilabilityEnum.private, author: userId }] : []),
        ...(userId ? [{ availability: AvalilabilityEnum.specificFriends, specificFriends: { $in: [userId] } }] : []),
        ...(userId ? [{ availability: { $ne: AvalilabilityEnum.private }, tags: { $in: [userId] } }] : [])
    ].filter(Boolean)
}

class PostService {
    private userModel = new UserRepository(UserModel);
    private postModel = new PostRepository(PostModel);
    private commentModel = new CommentRepository(CommentModel);
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
        if (req?.body?.tags?.length && ((await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req?.user?._id } } })).length !== req.body.tags.length)) {
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

    updatePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOne({ filter: { _id: postId, author: req.user?._id } });
        if (!post) throw new NotFoundException('Post not found');
        if (req?.body?.tags?.length && ((await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req?.user?._id } } })).length !== req.body.tags.length)) {
            throw new NotFoundException('One or more tag users not found');
        }
        let attachments: string[] = [];
        if (req.files?.length) {
            attachments = await AWS_UploadFiles({ files: req.files as Express.Multer.File[], path: `users/${post.author}/post/${post.assetsFolderId}` })
        }
        const updatedPost = await this.postModel.updateOne({
            filter: { _id: postId, author: req.user?._id },
            update: [{
                $set: {
                    content: req.body.content,
                    availability: req.body.availability,
                    allowComment: req.body.allowComment,
                    attachments: {
                        $setUnion: [
                            { $setDifference: ["$attachments", req.body.removedAttachments || []] },
                            attachments
                        ]
                    },
                    tags: {
                        $setUnion: [
                            { $setDifference: ["$tags", (req.body.removedTags || []).map((tag: string) => { return Types.ObjectId.createFromHexString(tag); })] },
                            (req.body.tags || []).map((tag: string) => { return Types.ObjectId.createFromHexString(tag) })
                        ]
                    },
                    specificFriends: {
                        $setUnion: [
                            { $setDifference: ["$specificFriends", (req.body.removedSpecificFriends || []).map((friend: string) => { return Types.ObjectId.createFromHexString(friend); })] },
                            (req.body.specificFriends || []).map((friend: string) => { return Types.ObjectId.createFromHexString(friend) })
                        ]
                    }
                }
            }]
        });
        if (!updatedPost) {
            if (attachments.length) {
                await AWS_DeleteFiles({ urls: attachments });
            }
            throw new BadRequestException('Post not updated, try again later');
        } else {
            if (req.body.removedAttachments?.length) {
                await AWS_DeleteFiles({ urls: req.body.removedAttachments });
            }
        }
        return SuccessResponse({ res, status: 201, message: 'Post updated' })
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
        const post = await this.postModel.findOneAndUpdate({
            filter: {
                _id: postId,
                $or: postAvailability(req)
            }, update
        });
        if (!post) throw new NotFoundException('Post not found or Post Frozen');
        return SuccessResponse({ res, status: 200, message: messageL === 'Post liked' ? messageL : 'Post unliked' });
    };

    getPosts = async (req: Request, res: Response): Promise<Response> => {
        let { page, size } = req.query as unknown as { page?: number, size?: number };
        const posts = await this.postModel.pagination({
            filter: { $or: postAvailability(req) },
            options: { populate: [{ path: 'comments', match: { commentId: { $exists: false }, freezedAt: { $exists: false } }, populate: [{ path: 'replies', match: { freezedAt: { $exists: false } } }] }] },
            page: page!,
            size: size!,
        })
        // let results = []
        // for (const post of posts.result) {
        //     const comments = await this.commentModel.find({ filter: { postId: post._id } })
        //     results.push({ post, comments })
        // }
        // posts.result = results
        // const posts = await this.postModel.findCursor({ filter: { $or: postAvailability(req) } })
        // console.log(`posts: ${posts}`);

        return SuccessResponse({ res, status: 200, message: 'Posts fetched', data: { posts } });
    }
    freezePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOneAndUpdate({ filter: { _id: postId, freezedAt: { $exists: false } }, update: { freezedAt: new Date(), freezedBy: req.user?._id } });
        if (!post) throw new NotFoundException('Post not found');
        return SuccessResponse({ res, status: 200, message: 'Post freezed successfully' });

    }
    unFreezePost = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOneAndUpdate({ filter: { _id: postId, freezedAt: { $exists: true } }, update: { $unset: { freezedAt: 1, freezedBy: 1 }, restoredAt: new Date(), restoredBy: req.user?._id } });
        if (!post) throw new NotFoundException('Post not found');
        return SuccessResponse({ res, status: 200, message: 'Post unfreezed successfully' });
    }
    deletePost = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId: Types.ObjectId };
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOne({ filter: { _id: postId, author: userId || req.user?._id } });
        if (!post) throw new NotFoundException('Post not found or you are not the author');
        const allComments = await this.commentModel.find({ filter: { postId } });
        const commentAttachments = allComments.flatMap(comment => comment.attachments || []);
        
        await Promise.all([
            this.postModel.deleteOne({ filter: { _id: postId } }),
            this.commentModel.deleteMany({ filter: { postId } }),
            post?.attachments?.length ? AWS_DeleteFiles({ urls: post.attachments }) : Promise.resolve(),
            commentAttachments.length ? AWS_DeleteFiles({ urls: commentAttachments }) : Promise.resolve()
        ])
        return SuccessResponse({ res, status: 200, message: 'Post deleted successfully' });
    }
    getPostById = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const post = await this.postModel.findOne({ filter: { _id: postId, $or: postAvailability(req) }, options: { populate: [{ path: 'comments', match: { commentId: { $exists: false }, freezedAt: { $exists: false } }, populate: [{ path: 'replies', match: { freezedAt: { $exists: false } } }] }] } });
        if (!post) throw new NotFoundException('Post not found');
        return SuccessResponse({ res, status: 200, message: 'Post fetched', data: { post } });
    }
}

export const postService = new PostService();