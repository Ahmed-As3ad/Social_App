import { DataRepository } from "./database.repository.js";
import { IComment as TDocument } from "../model/Comment.model.js";
import { Model } from "mongoose";

export class CommentRepository extends DataRepository<TDocument> {
    constructor( protected override readonly model: Model<TDocument> ) {
        super(model)
     }
}