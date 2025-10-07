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
        tags: generalFieldValidator.idsList.optional(),
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

export const likePost = {
    params: z.strictObject({
        postId: generalFieldValidator.id
    }),
    query: z.strictObject({
        action: z.enum(likeActionEnum).default(likeActionEnum.like)
    })
}