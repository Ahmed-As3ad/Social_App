import { HydratedDocument, model, models, Schema, Types } from "mongoose";

export interface IMessage {
    content: string;
    sender: Types.ObjectId;
    sentAt?: Date;
    updatedAt?: Date;
}

export type HMessageDocument = HydratedDocument<IMessage>;

export interface IChat {
    // chat OVO One Versus One
    participants: Types.ObjectId[];
    messages: IMessage[];
    // chat OVM Group One Versus Many
    group?: string;
    group_image?: string;
    room_Id?: string;
    // -------------------------------
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt?: Date;
}
export type HChatDocument = HydratedDocument<IChat>;

const messageSchema = new Schema<IMessage>({
    content: { type: String, required: true, minlength: 1, maxlength: 500000 },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true })

const chatSchema = new Schema<IChat>({
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    messages: [messageSchema],
    // createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    group: { type: String, minlength: 2, maxlength: 100 },
    group_image: { type: String },
    room_Id: { type: String, required: function () { return this.room_Id; } },
}, { timestamps: true, strictQuery: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

const chatModel = models?.Chat || model<IChat>('Chat', chatSchema);
export default chatModel;