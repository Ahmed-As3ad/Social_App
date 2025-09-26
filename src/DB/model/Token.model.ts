import { model, models, Schema } from "mongoose";
import type { HydratedDocument, Types } from "mongoose";

export interface IToken {
    jti: string;
    expiresIn: number;
    userId: Types.ObjectId;
}

const TokenSchema = new Schema<IToken>({
    jti: { type: String, required: true, unique: true },
    expiresIn: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
    timestamps: true
});

const TokenModel = models?.Token || model<IToken>('Token', TokenSchema);
export type HTokenDocument = HydratedDocument<IToken>;
export default TokenModel;
