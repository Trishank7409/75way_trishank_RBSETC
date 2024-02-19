import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/apiError.js.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

// get channel stats
const getChannelStats = asyncHandler(async (req, res) => {

   
    
    // total videos 
    const allVideo = await Video.aggregate([
        {
            $match: {
                videoOwner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $count: "Videos"
        }
    ])
    // total views 
    const allViews = await Video.aggregate([
        {
            $match:{
                videoOwner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $group: {
                _id: null,
                allVideosViews: {
                    $sum: "$views"
                }
            }
        }
    ])

    const stats = {
       
        totalVideos: allVideo[0].Videos,
        totalVideoViews: allViews[0].allVideosViews,
    

    }

    // return responce 
    return res.status(200).json(
        new ApiResponse(
            200,
            stats,
            "fetching channel stats successfullY!!"
        )
    )

})

// get channel videos
const getChannelVideos = asyncHandler(async (req, res) => {

    const allVideo = await Video.find({
        videoOwner: req.user._id
    })

    if(!allVideo){
        throw new ApiError(
            500,
            "something went wrong while fetching channel all videos!!"
        )
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            allVideo,
            "All videos fetched successfully !!"
        )
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }