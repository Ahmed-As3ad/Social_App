import { Request, Response } from "express";
import { Types } from "mongoose";
import { SuccessResponse } from "../../utils/response/success.response.js";
import { PostRepository } from "../../DB/repository/post.repository.js";
import PostModel, { allowCommentEnum, HPostDocument } from "../../DB/model/Post.model.js";
import { CommentRepository } from "../../DB/repository/comment.repository.js";
import CommentModel from "../../DB/model/Comment.model.js";
import { UserRepository } from "../../DB/repository/user.repository.js";
import UserModel from "../../DB/model/User.model.js";
import { postAvailability } from "../Post/post.service.js";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response.js";
import { AWS_DeleteFiles, AWS_UploadFiles } from "../../utils/multer/s3.config.js";

class CommentService {
    private commentModel = new CommentRepository(CommentModel);
    private postModel = new PostRepository(PostModel);
    private userModel = new UserRepository(UserModel);
    constructor() { }
    addComment = async (req: Request, res: Response): Promise<Response> => {
        const { postId } = req.params as unknown as { postId: Types.ObjectId };
        const { content } = req.body as { content: string };
        const post = await this.postModel.findOne({ filter: { $and: [{ _id: postId, allowComment: allowCommentEnum.allow }, { $or: postAvailability(req) }] } });
        if (!post) {
            throw new NotFoundException('Post not found or you are not allowed to comment on it');
        }
        if (req?.body?.tags?.length && (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?.id } } })).length !== req.body.tags.length) {
            throw new NotFoundException('One or more tagged users not found');
        }
        let attachments: string[] = [];
        if (req.files?.length) {
            attachments = await AWS_UploadFiles({ files: req.files as Express.Multer.File[], path: `users/${post.author}/post/${post.assetsFolderId}/comments` })
        }
        const comment = await this.commentModel.create({ data: { ...req.body, attachments, postId, author: req.user?._id } });
        if (comment) {
            await this.postModel.findOneAndUpdate({ filter: { _id: postId }, update: { $inc: { commentsCount: 1 } } });
        }
        if (!comment) {
            if (attachments.length) {
                await AWS_DeleteFiles({ urls: attachments });
            }
            throw new NotFoundException('Comment not added, try again later');
        }

        return SuccessResponse({ res, status: 201, message: 'Comment added' })
    }

    replyComment = async (req: Request, res: Response): Promise<Response> => {
        const { postId, commentId } = req.params as unknown as { postId: Types.ObjectId, commentId: Types.ObjectId };
        const { content } = req.body as { content: string };
        const comment = await this.commentModel.findOne({
            filter: { _id: commentId, postId }, options: {
                populate: [{
                    path: 'postId', match: {
                        $and: [{ allowComment: allowCommentEnum.allow }, { $or: postAvailability(req) }]
                    }
                }]
            }
        });

        if (!comment || !comment.postId) {
            throw new NotFoundException('Comment not found or you are not allowed to reply to it');
        }
        if (req?.body?.tags?.length && (await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req.user?.id } } })).length !== req.body.tags.length) {
            throw new NotFoundException('One or more tagged users not found');
        }
        let attachments: string[] = [];
        if (req.files?.length) {
            const post = comment.postId as Partial<HPostDocument>;
            attachments = await AWS_UploadFiles({ files: req.files as Express.Multer.File[], path: `users/${post.author}/post/${post.assetsFolderId}/comments` })
        }
        const reply = await this.commentModel.create({ data: { ...req.body, attachments, postId, commentId, author: req.user?._id } });
        if (reply) {
            await this.postModel.findOneAndUpdate({ filter: { _id: postId }, update: { $inc: { commentsCount: 1 } } });
        }
        if (!reply) {
            if (attachments.length) {
                await AWS_DeleteFiles({ urls: attachments });
            }
            throw new NotFoundException('Comment not added, try again later');
        }

        return SuccessResponse({ res, status: 201, message: 'reply added' })
    }

    freezeComment = async (req: Request, res: Response): Promise<Response> => {
        const { commentId } = req.params as unknown as { commentId: Types.ObjectId };
        const comment = await this.commentModel.findOneAndUpdate({ filter: { _id: commentId, freezedAt: { $exists: false } }, update: { freezedAt: new Date(), freezedBy: req.user?._id } });
        if (!comment) throw new NotFoundException('Comment not found');
        return SuccessResponse({ res, status: 200, message: 'Comment freezed successfully' });

    }
    unFreezeComment = async (req: Request, res: Response): Promise<Response> => {
        const { commentId } = req.params as unknown as { commentId: Types.ObjectId };
        const comment = await this.commentModel.findOneAndUpdate({ filter: { _id: commentId, freezedAt: { $exists: true } }, update: { $unset: { freezedAt: 1, freezedBy: 1 }, restoredAt: new Date(), restoredBy: req.user?._id } });
        if (!comment) throw new NotFoundException('Comment not found');
        return SuccessResponse({ res, status: 200, message: 'Comment unfreezed successfully' });
    }
    deleteComment = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId?: Types.ObjectId };
        const { commentId } = req.body as unknown as { commentId: Types.ObjectId };
        const comment = await this.commentModel.findOne({ filter: { _id: commentId, author: userId || req.user?._id } });
        if (!comment) throw new NotFoundException('Comment not found');
        const allReplies = await this.commentModel.find({ filter: { commentId } });
        const replyAttachments = allReplies.flatMap(reply => reply.attachments || []);
        if (comment.postId) {
            await this.postModel.findOneAndUpdate({
                filter: { _id: comment.postId },
                update: { $inc: { commentsCount: -(1 + allReplies.length) } }
            });
        }
        await Promise.all([
            this.commentModel.deleteOne({ filter: { _id: commentId } }),
            this.commentModel.deleteMany({ filter: { commentId } }), 
            comment?.attachments?.length ? AWS_DeleteFiles({ urls: comment.attachments }) : Promise.resolve(),
            replyAttachments.length ? AWS_DeleteFiles({ urls: replyAttachments }) : Promise.resolve()
        ]);
        return SuccessResponse({ res, status: 200, message: 'Comment deleted successfully' });
    }
    updateComment = async (req: Request, res: Response): Promise<Response> => {
        const { commentId } = req.params as unknown as { commentId: Types.ObjectId };
        const comment = await this.commentModel.findOne({ filter: { _id: commentId, author: req.user?._id } });
        if (!comment) throw new NotFoundException('Comment not found');
        if (req?.body?.tags?.length && ((await this.userModel.find({ filter: { _id: { $in: req.body.tags, $ne: req?.user?._id } } })).length !== req.body.tags.length)) {
            throw new NotFoundException('One or more tag users not found');
        }
        let attachments: string[] = [];
        if (req.files?.length) {
            const post = comment.postId as Partial<HPostDocument>;
            attachments = await AWS_UploadFiles({ files: req.files as Express.Multer.File[], path: `users/${post.author}/post/${post.assetsFolderId}` })
        }
        const updatedComment = await this.commentModel.updateOne({
            filter: { _id: commentId, author: req.user?._id },
            update: [{
                $set: {
                    content: req.body.content,
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
                }
            }]
        });
        if (!updatedComment) {
            if (attachments.length) {
                await AWS_DeleteFiles({ urls: attachments });
            }
            throw new BadRequestException('Comment not updated, try again later');
        } else {
            if (req.body.removedAttachments?.length) {
                await AWS_DeleteFiles({ urls: req.body.removedAttachments });
            }
        }
        return SuccessResponse({ res, status: 201, message: 'Comment updated' })
    }
    getCommentById = async (req: Request, res: Response): Promise<Response> => {
        const { commentId } = req.params as unknown as { commentId: Types.ObjectId };
        const comment = await this.commentModel.findOne({ filter: { _id: commentId }, options: { populate: [{ path: 'author', select: 'firstName lastName avatar' }, { path: 'postId', select: 'author assetsFolderId' }, { path: 'commentId', select: 'author' }] } });
        if (!comment) throw new NotFoundException('Comment not found');
        return SuccessResponse({ res, status: 200, message: 'Comment fetched successfully', data: comment })
    }
}
export const commentService = new CommentService();