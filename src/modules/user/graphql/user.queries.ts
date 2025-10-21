import { GraphQLFieldConfigMap, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';
import { UserType } from './user.type.js';
import userService from '../user.service.js';

export const userQueries: GraphQLFieldConfigMap<any, any> = {
    user: {
        type: UserType,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args, context) => {
            // Implement user query resolver
            // return await userService.getUserById(args.id);
            return null;
        }
    },
    users: {
        type: new GraphQLList(UserType),
        resolve: async (parent, args, context) => {
            // Implement users list resolver
            // return await userService.getUsers();
            return [];
        }
    },
    me: {
        type: UserType,
        resolve: async (parent, args, context) => {
            // Implement current user resolver
            // return context.user;
            return null;
        }
    }
};
