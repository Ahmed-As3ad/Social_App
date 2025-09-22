import { CreateOptions, HydratedDocument, Model } from "mongoose";
import { IUser as TDocument } from "../model/User.model.js";
import { DataRepository } from "./database.repository.js";
import { BadRequestException } from "../../utils/response/error.response.js";

export class UserRepository extends DataRepository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }
    async createUser({ data, options }: { data: Partial<TDocument>[], options?: CreateOptions }): Promise<HydratedDocument<TDocument> | undefined> {
        const [newUser] = (await this.create( {data} )) || [];
        if (!newUser) {
            throw new BadRequestException('fail to create user');
        }
        return newUser;
    }
}
