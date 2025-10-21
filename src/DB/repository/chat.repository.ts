import { Model } from "mongoose";
import { DataRepository } from "./database.repository.js";
import { IChat as TDocument } from "../model/Chat.model.js";

export class ChatRepository extends DataRepository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model);
    }
}