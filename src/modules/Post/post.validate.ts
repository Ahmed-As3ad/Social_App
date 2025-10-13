import z from "zod";
import { allowCommentEnum, AvalilabilityEnum, likeActionEnum } from "../../DB/model/Post.model.js";
import { generalFieldValidator } from "../../middleware/validation.middleware.js";
import { ALLOWED_MIME_TYPES } from "../../utils/multer/cloud.multer.js";

export const createPost = {
    body: z.strictObject({
        content: z.string().min(2).max(500, 'Content must be less than 500 characters').optional(),
        attachments: z.array(generalFieldValidator.file(ALLOWED_MIME_TYPES.image)).min(1).max(2).optional(),
        availability: z.enum(AvalilabilityEnum).default(AvalilabilityEnum.public),
        allowComment: z.enum(allowCommentEnum).default(allowCommentEnum.allow),
        specificFriends: z.array(z.string()).max(20, 'Specific friends can have a maximum length of 20 characters').optional(),
        tags: z.array(generalFieldValidator.id).optional(),
    }).superRefine((data, ctx) => {
        if (!data.content && !data.attachments) {
            ctx.addIssue({
                code: "custom",
                path: ['content'],
                message: 'at least content or attachments is required'
            })
            if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['tags'],
                    message: 'Duplicate tags users must be unique'
                })
            }

        }
    })
}
export const updatePost = {
    params: z.strictObject({
        postId: generalFieldValidator.id
    }),
    body: z.strictObject({
        content: z.string().min(2).max(500, 'Content must be less than 500 characters').optional(),
        attachments: z.array(generalFieldValidator.file(ALLOWED_MIME_TYPES.image)).max(2).optional(),
        removedAttachments: z.array(z.string()).optional(),
        availability: z.enum(AvalilabilityEnum).optional(),
        allowComment: z.enum(allowCommentEnum).optional(),
        specificFriends: z.array(generalFieldValidator.idsList).max(20, 'Specific friends can have a maximum length of 20 characters').optional(),
        removedSpecificFriends: z.array(generalFieldValidator.idsList).max(20, 'Specific friends can have a maximum length of 20 characters').optional(),
        tags: z.array(generalFieldValidator.id).optional(),
        removedTags: z.array(generalFieldValidator.id).optional(),
    }).superRefine((data, ctx) => {
        if (!Object.values(data).length) {
            ctx.addIssue({
                code: "custom",
                path: ['content'],
                message: 'at least content or attachments is required'
            })
            if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['tags'],
                    message: 'Duplicate tags users must be unique'
                })
            }
            if (data.removedTags?.length && data.removedTags.length !== [...new Set(data.removedTags)].length) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['removedTags'],
                    message: 'Duplicate removedTags users must be unique'
                })
            }
            if (data.specificFriends?.length && data.specificFriends.length !== [...new Set(data.specificFriends)].length) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['specificFriends'],
                    message: 'Duplicate specificFriends users must be unique'
                })
            }
            if (data.removedSpecificFriends?.length && data.removedSpecificFriends.length !== [...new Set(data.removedSpecificFriends)].length) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['removedSpecificFriends'],
                    message: 'Duplicate removedSpecificFriends users must be unique'
                })
            }

        }
    })
}

export const likePost = {
    params: z.strictObject({
        postId: generalFieldValidator.id
    }),
    query: z.strictObject({
        action: z.enum(likeActionEnum).default(likeActionEnum.like)
    })
}

export const freezePost = {
    params: z.strictObject({
        postId: generalFieldValidator.id
    })
}
export const unFreezePost = {
    params: freezePost.params
}
export const deletePost = {
    params: z.strictObject({
        userId: generalFieldValidator.id
    }),
    body: z.strictObject({
        postId: generalFieldValidator.id
    })
}
export const getPostById = {
    params: z.strictObject({
        postId: generalFieldValidator.id
    })
}