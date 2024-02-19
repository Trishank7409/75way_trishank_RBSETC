import connectDB from './db/mongoConnect.js'
import dotenv from 'dotenv'
import { app } from './app.js'
dotenv.config({
    path:'./env'
})


connectDB()
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`Serveer is stated at ${process.env.PORT}`)
    })
})
.catch((e)=>{
    console.log("Error occur at connection", e)
})

