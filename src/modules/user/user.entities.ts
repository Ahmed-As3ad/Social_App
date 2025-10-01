import { HUserDocument } from "../../DB/model/User.model.js";

export interface IUserSuccess{
    user:Partial<HUserDocument>;
}
export interface IgetPreSignedUrl{
    url:string;
}