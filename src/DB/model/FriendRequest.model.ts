import { HydratedDocument, model, models, Schema, Types } from "mongoose";

export enum FriendRequestStatusEnum {
    pending = "pending",
    accepted = "accepted",
}

export interface IFriendRequest {
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    status: FriendRequestStatusEnum;
    AcceptedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const postSchema = new Schema<IFriendRequest>({
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: Object.values(FriendRequestStatusEnum), default: FriendRequestStatusEnum.pending },
    AcceptedAt: { type: Date },
}, { timestamps: true, strictQuery: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });


postSchema.pre(['find', 'findOne', 'findOneAndUpdate', 'updateOne', 'countDocuments'], function (next) {
    const query = this.getQuery();
    if (query.paranoid === false) {
        this.setQuery({ ...query })
    } else {
        this.setQuery({ ...query, freezedAt: { $exists: false } });
    }
    next();
});

export type HFriendRequestDocument = HydratedDocument<IFriendRequest>;
const FriendRequestModel = models?.FriendRequest || model<IFriendRequest>('FriendRequest', postSchema);
export default FriendRequestModel;