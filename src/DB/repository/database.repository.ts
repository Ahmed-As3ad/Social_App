import { FlattenMaps, MongooseUpdateQueryOptions, PopulateOptions, ProjectionType, QueryOptions, QueryWithHelpers, Types, UpdateQuery, UpdateWriteOpResult } from "mongoose";
import { CreateOptions, HydratedDocument, Model, RootFilterQuery } from "mongoose";

// Type Lean
export type Lean<T> = HydratedDocument<FlattenMaps<T>>

export abstract class DataRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) { }
    async findOne({ filter, select, options }: { filter?: RootFilterQuery<TDocument>, select?: ProjectionType<TDocument>, options?: QueryOptions<TDocument> }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        const doc = this.model.findOne(filter, options).select(select || "");
        if (options?.populate) {
            doc.populate(options?.populate as PopulateOptions[])
        }
        if (options?.lean) {
            doc.lean(options?.lean);
        }
        return doc.exec();
    }

    async updateOne({ filter, update, options }: { filter?: RootFilterQuery<TDocument>, update?: UpdateQuery<TDocument>, options?: MongooseUpdateQueryOptions<TDocument> | null }): Promise<QueryWithHelpers<UpdateWriteOpResult, TDocument>> {
        return this.model.updateOne(
            filter || {},
            { ...update, $inc: { __v: 1 } },
            options || {}
        );
    }

    async findByIdAndUpdate({ id, update, options }: { id: Types.ObjectId, update?: UpdateQuery<TDocument>, options?: MongooseUpdateQueryOptions<TDocument> | null }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        return this.model.findByIdAndUpdate(
            id,
            { ...update, $inc: { __v: 1 } },
            { new: true, ...options }
        ).exec();
    }

    async findAndUpdate({ filter, update, options }: { filter?: RootFilterQuery<TDocument>, update?: UpdateQuery<TDocument>, options?: MongooseUpdateQueryOptions<TDocument> | null }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        return this.model.findOneAndUpdate(
            filter || {},
            { ...update, $inc: { __v: 1 } },
            { new: true, ...options }
        ).exec();
    }

    async deleteOne({ filter }: { filter?: RootFilterQuery<TDocument> }): Promise<{ deletedCount?: number }> {
        return this.model.deleteOne(filter).exec();
    }

    async create({ data, options }: { data: Partial<TDocument>[], options?: CreateOptions }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return await this.model.create(data, options)
    }
}