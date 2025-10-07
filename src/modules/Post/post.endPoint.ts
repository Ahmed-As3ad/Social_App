import { RoleEnum } from "../../DB/model/User.model.js";

export const endPointAccess = {
    createPost: [RoleEnum.user, RoleEnum.admin, RoleEnum.superAdmin],
}