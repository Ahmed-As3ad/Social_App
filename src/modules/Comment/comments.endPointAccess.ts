import { RoleEnum } from "../../DB/model/User.model.js";

export const endPointAccess = {
    freezeComment: [RoleEnum.admin, RoleEnum.superAdmin],
    unFreezeComment: [RoleEnum.admin, RoleEnum.superAdmin]
}