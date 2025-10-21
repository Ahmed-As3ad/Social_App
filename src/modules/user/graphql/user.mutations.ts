import { GraphQLFieldConfigMap, GraphQLString, GraphQLNonNull } from 'graphql';
import { UserType } from './user.type.js';

export const userMutations: GraphQLFieldConfigMap<any, any> = {
    updateUser: {
        type: UserType,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            firstName: { type: GraphQLString },
            lastName: { type: GraphQLString },
        },
        resolve: async (parent, args, context) => {
            // Implement update user resolver
            // return await userService.updateUser(args);
            return null;
        }
    },
    deleteUser: {
        type: GraphQLString,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args, context) => {
            // Implement delete user resolver
            // await userService.deleteUser(args.id);
            return 'User deleted successfully';
        }
    }
};
