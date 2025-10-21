import { GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';

export const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        _id: { type: new GraphQLNonNull(GraphQLString) },
        firstName: { type: new GraphQLNonNull(GraphQLString) },
        lastName: { type: new GraphQLNonNull(GraphQLString) },
        fullName: { type: GraphQLString },
        email: { type: new GraphQLNonNull(GraphQLString) },
        avatar: { type: GraphQLString },
        DOB: { type: GraphQLString },
        role: { type: GraphQLString },
        friends: { type: new GraphQLList(GraphQLString) },
        confirmedAt: { type: GraphQLString },
        createdAt: { type: GraphQLString },
        updatedAt: { type: GraphQLString },
    })
});
