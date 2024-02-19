import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'



const app =express()


// middleware used for interact backend application to predefine origin
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true,
}  
))

// middleware used for accepting the form data in json
app.use(express.json({limit:"20kb"}))

// middleware used to handle data from URL

app.use(express.urlencoded({extended:true, limit:"20kb"}))

// configure static file
app.use(express.static("Public"))

// set up cookie parser

app.use(cookieParser())


// Routes importing

import userRouter from './routes/user.routes.js'
import playlistRouter from './routes/playlist.routes.js'
import videoRouter from './routes/video.routes.js'


// decraration of route using middleware always
app.use("/api/v1/users",userRouter)
app.use("/api/v1/playlist",playlistRouter)
app.use("/api/v1/video",videoRouter)



export {app}