import { GraphQLSchema, GraphQLObjectType } from 'graphql';
import { userQueries, userMutations } from '../user/graphql/index.js';

export class GraphQLSchemaBuilder {
    constructor() { }
    
    public schema: GraphQLSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
            name: 'Query',
            fields: {
                ...userQueries,
            }
        }),
        mutation: new GraphQLObjectType({
            name: 'Mutation',
            fields: {
                ...userMutations,
            }
        })
    });
}
        