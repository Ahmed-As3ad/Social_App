import { HydratedDocument, model, models, Schema, Types } from "mongoose";
import { IPost } from "./Post.model.js";


export interface IComment {
    postId: Types.ObjectId | Partial<IPost>;
    author: Types.ObjectId;
    content: string;
    commentId?: Types.ObjectId;
    attachments?: string[];
    likes?: Types.ObjectId[];
    tags?: Types.ObjectId[],
    freezedBy?: Types.ObjectId;
    freezedAt?: Date;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt?: Date;
}

const commentSchema = new Schema<IComment>({
    postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    commentId: { type: Schema.Types.ObjectId, ref: "Comment" },
    content: { type: String, minlength: 2, maxLength: 500000, required: true },
    attachments: [String],
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: Schema.Types.ObjectId, ref: "User" }],
    freezedBy: { type: Schema.Types.ObjectId, ref: "User" },
    freezedAt: { type: Date },
    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true, strictQuery: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

commentSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'updateOne', 'countDocuments'], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});

commentSchema.virtual('replies', {
    localField: '_id',
    foreignField: 'commentId',
    ref: 'Comment',
    justOne: true
})

export type HCommentDocument = HydratedDocument<IComment>;
const CommentModel = models?.Comment || model<IComment>('Comment', commentSchema);
export default CommentModel;