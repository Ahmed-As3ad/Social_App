import { Model } from "mongoose";
import { IToken as TDocument } from '../model/Token.model.js'
import { DataRepository } from "./database.repository.js";

export class TokenRepository extends DataRepository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)

    }
}