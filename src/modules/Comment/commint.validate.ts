import z from "zod";
import { generalFieldValidator } from "../../middleware/validation.middleware.js";
import { ALLOWED_MIME_TYPES } from "../../utils/multer/cloud.multer.js";


export const addCommentValidate = {
    params: z.strictObject({
        postId: generalFieldValidator.id,
    }),
    body: z.strictObject({
        content: z.string().min(2).max(500000),
        attachments: z.array(generalFieldValidator.file(ALLOWED_MIME_TYPES.image)).max(2).optional(),
        tags: z.array(generalFieldValidator.id).optional(),
    }).superRefine((data, ctx) => {
        if (!data.content && !data.attachments?.length) {
            ctx.addIssue({
                code: "custom",
                message: "Either content or attachments must be provided"
            })
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: 'custom',
                path: ['tags'],
                message: 'Duplicate tags users must be unique'
            })
        }
    })
}

export const replyCommentValidate = {
    params: addCommentValidate.params.extend({
        commentId: generalFieldValidator.id,
    }),
    body: addCommentValidate.body,
}
export const updateCommentValidate = {
    params: z.strictObject({
        commentId: generalFieldValidator.id,
    }),
    body: z.strictObject({
        content: z.string().min(2).max(500000).optional(),
        attachments: z.array(generalFieldValidator.file(ALLOWED_MIME_TYPES.image)).max(2).optional(),
        tags: z.array(generalFieldValidator.id).optional(),
    }).superRefine((data, ctx) => {
        if (!data.content && !data.attachments?.length) {
            ctx.addIssue({
                code: "custom",
                message: "Either content or attachments must be provided"
            })
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: 'custom',
                path: ['tags'],
                message: 'Duplicate tags users must be unique'
            })
        }
    })
}
export const freezeCommentValidate = {
    params: z.strictObject({
        commentId: generalFieldValidator.id,
    })
}
export const unfreezeCommentValidate = {
    params: freezeCommentValidate.params
}
export const deleteCommentValidate = {
    params: z.strictObject({
        userId: generalFieldValidator.id.optional(),
    }),
    body: freezeCommentValidate.params
}
export const getCommentById = {
    params: z.strictObject({
        commentId: generalFieldValidator.id,
    })
}