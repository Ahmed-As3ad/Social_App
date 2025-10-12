import { Model } from "mongoose";
import { DataRepository } from "./database.repository.js";
import { IFriendRequest as TDocument } from "../model/FriendRequest.model.js";


export class FriendRequestRepository extends DataRepository<TDocument>{
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }
}