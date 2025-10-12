import { FlattenMaps, MongooseUpdateQueryOptions, PopulateOptions, ProjectionType, QueryOptions, QueryWithHelpers, Types, UpdateQuery, UpdateWriteOpResult } from "mongoose";
import { CreateOptions, HydratedDocument, Model, RootFilterQuery } from "mongoose";

// Type Lean
export type Lean<T> = HydratedDocument<FlattenMaps<T>>

export abstract class DataRepository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) { }
    async findOne({ filter, select, options }: { filter?: RootFilterQuery<TDocument>, select?: ProjectionType<TDocument>, options?: QueryOptions<TDocument> }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        const { populate, lean, ...otherOptions } = options || {};
        const doc = this.model.findOne(filter, otherOptions).select(select || "");
        if (populate) {
            doc.populate(populate as PopulateOptions[])
        }
        if (lean) {
            doc.lean(lean);
        }
        return doc.exec();
    }

    async find({ filter, select, options }: { filter?: RootFilterQuery<TDocument>, select?: ProjectionType<TDocument>, options?: QueryOptions<TDocument> }): Promise<(Lean<TDocument> | HydratedDocument<TDocument>)[]> {
        const { lean, populate, skip, limit, ...otherOptions } = options || {};
        const docs = this.model.find(filter || {}, otherOptions).select(select || "");
        if (lean) {
            docs.lean(lean);
        }
        if (skip) {
            docs.skip(skip);
        }
        if (limit) {
            docs.limit(limit);
        }
        if (populate) {
            docs.populate(populate as PopulateOptions[]);
        }
        return docs.exec();
    }
    async pagination({ filter, select, options, page = 'all', size = 5 }: { filter: RootFilterQuery<TDocument>, select?: ProjectionType<TDocument>, options?: QueryOptions<TDocument>, page?: number | 'all', size?: number }): Promise<(HydratedDocument<TDocument>)[] | [] | any> {
        let docsCount: number | undefined = undefined;
        let totalPages: number | undefined = undefined;
        docsCount = await this.model.countDocuments(filter || {});
        totalPages = docsCount ? Math.ceil(docsCount / size) : 1;
        const { populate, lean, ...otherOptions } = options || {};
        const query = this.model.find(filter || {}, otherOptions).select(select || "");
        if (populate) {
            query.populate(populate as PopulateOptions[]);
        }
        if (lean) {
            query.lean(lean);
        }
        const result = await query.skip((page === 'all' ? 0 : ((page - 1) * size))).limit(page === 'all' ? 0 : size);
        return { docsCount, totalPages, currentPage: page === 'all' ? 1 : page, result };
    }

    async updateOne({ filter, update, options }: { filter?: RootFilterQuery<TDocument>, update?: UpdateQuery<TDocument>, options?: MongooseUpdateQueryOptions<TDocument> | null }): Promise<QueryWithHelpers<UpdateWriteOpResult, TDocument>> {
        if (Array.isArray(update)) {
            update.push({ $set: { __v: { $add: ['$__v', 1] } } });
            return this.model.updateOne(
                filter || {}, update, options || {});
        }

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

    async findOneAndUpdate({ filter, update, options }: { filter?: RootFilterQuery<TDocument>, update?: UpdateQuery<TDocument>, options?: MongooseUpdateQueryOptions<TDocument> | null }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        return this.model.findOneAndUpdate(
            filter || {},
            { ...update, $inc: { __v: 1 } },
            { new: true, ...options }
        ).exec();
    }
    async findOneAndDelete({ filter, options }: { filter?: RootFilterQuery<TDocument>, options?: MongooseUpdateQueryOptions<TDocument> | null }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        return this.model.findOneAndDelete(
            filter || {}, options || {}
        ).exec();
    }

    async deleteOne({ filter }: { filter?: RootFilterQuery<TDocument> }): Promise<{ deletedCount?: number }> {
        return this.model.deleteOne(filter).exec();
    }

    async deleteMany({ filter }: { filter?: RootFilterQuery<TDocument> }): Promise<{ deletedCount?: number }> {
        return this.model.deleteMany(filter).exec();
    }

    async create({ data, options }: { data: Partial<TDocument>[], options?: CreateOptions }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return await this.model.create(data, options)
    }
}