import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDb = async () => {
    try {
        const connection = await mongoose.connect(`${process.env.MONGO_URL}/${DB_NAME}`)
        console.log("connected to mongodb")
    } catch (error) {
        console.log(error, "mongodb connection error")
        process.exit(1)

    }
}
export default connectDb
