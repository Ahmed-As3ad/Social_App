import { connect } from "mongoose";
import UserModel from "./model/User.model.js";

export const connectDb = async (): Promise<void> => {
    try {
        const result = await connect(process.env.DB_URI as string)
        console.log(`Models:`, result.connection.modelNames());
        console.log(`connected to DB Successfull🎉`);
        await UserModel.syncIndexes();
    } catch (error) {
        console.log(`Fail connect to DB ❌`);
    }
}

export default connectDb;