import { FlattenMaps, PopulateOptions, ProjectionType, QueryOptions } from "mongoose";
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

    async create({ data, options }: { data: Partial<TDocument>[], options?: CreateOptions }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return await this.model.create(data, options)
    }
}