import { HChatDocument } from "../../DB/model/Chat.model.js";

export interface IGetChatResponse{
    chat: Partial<HChatDocument>;
}