import { DataRepository } from "./database.repository";
import { IPost as TDocument } from '../model/Post.model'
import { Model } from "mongoose";

export class PostRepository extends DataRepository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }
}