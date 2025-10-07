import { HydratedDocument, model, models, Schema, Types } from "mongoose";

export enum allowCommentEnum {
    allow = "allow",
    deny = "deny"
}

export enum AvalilabilityEnum {
    public = "public",
    private = "private",
    friends = "friends",
    specificFriends = "specificFriends"
}

export enum likeActionEnum {
    like = "like",
    unlike = "unlike"
}

export interface IPost {
    content?: string;
    attachments?: string[];
    allowComment?: allowCommentEnum;
    availability?: AvalilabilityEnum;
    specificFriends?: Types.ObjectId[];
    tags?: Types.ObjectId[];
    likes?: Types.ObjectId[];
    assetsFolderId?: string;
    bookmarks?: Types.ObjectId[];
    author: Types.ObjectId;
    freezedBy?: Types.ObjectId;
    freezedAt?: Date;
    restoredAt?: Date;
    restoredBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const postSchema = new Schema<IPost>({
    content: { type: String, minlength: 2, maxLength: 500000, required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attachments: [String],
    allowComment: { type: String, enum: Object.values(allowCommentEnum), default: allowCommentEnum.allow },
    availability: { type: String, enum: Object.values(AvalilabilityEnum), default: AvalilabilityEnum.public },
    specificFriends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assetsFolderId: { type: String, required: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    tags: [{ type: Schema.Types.ObjectId, ref: "User" }],
    bookmarks: [{ type: Schema.Types.ObjectId, ref: "User" }],
    freezedBy: { type: Schema.Types.ObjectId, ref: "User" },
    freezedAt: { type: Date },
    restoredAt: { type: Date },
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true, strictQuery: true });

postSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'updateOne'], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});

export type HPostDocument = HydratedDocument<IPost>;
const PostModel = models?.Post || model<IPost>('Post', postSchema);
export default PostModel;