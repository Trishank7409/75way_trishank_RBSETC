
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { Apierror } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import  Jwt  from "jsonwebtoken";


export const verifyJWT=asyncHandler(async(req,res,next)=>{
try {
      const token=  req.cookies?.accessToken||req.header("Authorization")?.replace("Bearer ","")
    
      if(!token){
        throw new Apierror(402,"token not recieved")
      }
    const decodedJWT=Jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    
    const user=await User.findById(decodedJWT?._id).select("-refreshToken -password")
    
    if(!user){
        throw new Apierror(403,"Invalid access token")
    }
    req.token=token
    req.user=user

    if (req.query.videoId) {
        const video = await Video.findById(req.query.videoId);
        if (video && video.isPaid && !user.purchasedVideos.includes(video._id)) {
            throw new Apierror(403, "You don't have access to this paid video.");
        }
    }




    next()

} catch (error) {
    throw new Apierror(401,error?.message||"Invalid requst")
}

})