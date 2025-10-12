import { DataRepository, Lean } from "./database.repository";
import { IPost as TDocument } from '../model/Post.model'
import { HydratedDocument, Model, PopulateOptions, ProjectionType, QueryOptions, RootFilterQuery } from "mongoose";
import { CommentRepository } from "./comment.repository.js";
import CommentModel from "../model/Comment.model.js";

export class PostRepository extends DataRepository<TDocument> {
    private commentModel = new CommentRepository(CommentModel);
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }

        async findCursor({ filter, select, options }: { filter?: RootFilterQuery<TDocument>, select?: ProjectionType<TDocument>, options?: QueryOptions<TDocument> }): Promise<(Lean<TDocument> | HydratedDocument<TDocument>)[]> {
            const cursor = this.model.find(filter || {}).select(select || "").populate(options?.populate as PopulateOptions[]).cursor();
            const results = [] as any[];
            for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
               const comments = await this.commentModel.find({filter: {postId: doc._id, commentId: {$exists: false}}});
               results.push({ post: doc, comments });

            }
            return results;
        }
}