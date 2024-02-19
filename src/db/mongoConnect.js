import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";
import 'dotenv/config'
console.log(process.env.MONGODB_URI)
const connectDB= async()=>{
    try {
      const connectionInstance=  await mongoose.connect(`${process.env.MONGODB_URI}`)

      console.log(`\n MongoDb connected !! DB HOST : ${connectionInstance.connection.host}`)
    

    } catch (error) {
        console.log('MongoDb Connection Failed :',error)
        process.exit(1);
    }
}

export default connectDB