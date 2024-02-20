import mongoose, { isValidObjectId } from "mongoose";
import { deleteOnCloudinary, uploadCloudinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Apierror } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";

// publish video
const publishAVideo = asyncHandler(async (req, res) => {
    const { title , description, isPublished = true } = req.body

    const user= await User.findById(req.user._id)

    if (!user) {
        throw new Apierror('User not found', 401);
    }
    

    if(!title || title?.trim()===""){
        throw new Apierror(400, "Title content is required")
    }
    if(!description || description?.trim()===""){
        throw new Apierror(400, "description content is required")
    }
    // local path 
    const videoFileLocalPath = req.files?.videoFile?.[0].path
    const thumbnailFileLocalPath = req.files?.thumbnail?.[0].path

    if(!videoFileLocalPath){
        throw new Apierror(400, "video file missing !!")
    }

    // upload on cloudinary 
    const videoFile = await uploadCloudinary(videoFileLocalPath)
    const thumbnail = await uploadCloudinary(thumbnailFileLocalPath)

    if(!videoFile){
        throw new Apierror(500, "something went wrong while uploading video file on cloudinary")
    }

    // strore in the database 
    const video = await Video.create({
      
        videoFile: videoFile?.url,
        thumbnail: thumbnail?.url,
        title,
        description,
        isPublished,
        Owner: req.user._id,
        Duration: videoFile?.duration
    })

    if(!video){
        throw new Apierror(500, "something went wrong while store the video in database")
    }

    // retern the response 
    return res.status(201).json(
        new apiResponse(200, video, "video uploaded successfully!!")
    );
})

//  update video details
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    const thumbnailFile = req.file?.path

    if(!isValidObjectId(videoId)){
        throw new Apierror(400, "This video id is not valid")
    } 
    // if any feild not provide
    if(
        !(thumbnailFile || !(!title || title?.trim() === "") || !(!description || description?.trim() === ""))
    ){
        throw new Apierror(400, "update fields are required")
    }

    // find video 
    const previousVideo = await Video.findOne(
        {
            _id: videoId
        }
    )
    if(!previousVideo){
        throw new Apierror(404, "video not found")
    }

    let updateFields = {
        $set:{
            title,
            description,
        }
    }

    // if thumbnail provided delete the previous one and upload new on 
    let thumbnailUploadOnCloudinary;
    if(thumbnailFile){
        await deleteOnCloudinary(previousVideo.thumbnail?.public_id)

        // upload new one 
         thumbnailUploadOnCloudinary = await uploadCloudinary(thumbnailFile);

        if(!thumbnailUploadOnCloudinary){
            throw new Apierror(500, "something went wrong while updating thumbnail on cloudinary !!")
        }

        updateFields.$set.thumbnail = thumbnailUploadOnCloudinary.url;
    }

    const updatedVideoDetails = await Video.findByIdAndUpdate(
        videoId,
        updateFields,
        {
            new: true
        }
    )

    if(!updatedVideoDetails){
        throw new Apierror(500, "something went wrong while updating video details");
    }

    //retrun responce
    return res.status(200).json(new apiResponse(
        200,
        { updatedVideoDetails },
        "Video details updated successfully!"
    ));

})

// get video by id
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new Apierror(400, "This video id is not valid")
    } 

    const video = await Video.findById(
        {
            _id: videoId
        }
    )

    if(!video){
        throw new Apierror(404, "video not found")
    }

    // return responce
    return res.status(200).json(
        new apiResponse(
            200,
            video,
            "video fetched successfully!!"
        )
    )
})

// get all video 
const getAllVideos = asyncHandler(async (req, res) => {
    const { 

        page = 1,
        limit = 10,
        query = `/^video/`,
        sortBy = "createdAt",
        sortType = 1, 
        userId = req.user._id } = req.query

    // find user in db
    const user = await User.findById(
        {
            _id: userId
        }
    )

    if(!user){
        throw new Apierror(404, "user not found")
    }

    const getAllVideosAggregate = await Video.aggregate([
        {
            $match: { 
                videoOwner: new mongoose.Types.ObjectId(userId),
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ]
            }
        },
        {
            $sort:{
                [sortBy]: sortType
            }
        },
        {
            $skip: (page -1) * limit
        },
        {
            $limit: parseInt(limit)
        }

    ])

    Video.aggregatePaginate(getAllVideosAggregate, {page, limit})
    .then((result)=>{
        return res
        .status(200)
        .json(
            new apiResponse(
                200,
                result,
                "fetched all videos successfully !!"
            )
        )
    })
    .catch((error)=>{
        console.log("getting error while fetching all videos:",error)
        throw error
    })


})


// delete video
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new Apierror(400, "This video id is not valid")
    } 

    // find video in db
    const video = await Video.findById(
        {
            _id: videoId
        }
    )

    if(!video){
        throw new Apierror(404, "video not found")
    }

    if (video.Owner.toString() !== req.user._id.toString()) {
        throw new Apierror(403, "You don't have permission to delete this video!");
    }

    // delete video and thumbnail in cloudinary
    if(video.videoFile){
        await deleteOnCloudinary(video.videoFile.public_id, "video")
    }

    if(video.thumbnail){
        await deleteOnCloudinary(video.thumbnail.public_id)
    }

    const deleteResponce = await Video.findByIdAndDelete(videoId)

    if(!deleteResponce){
        throw new Apierror(500, "something went wrong while deleting video !!")
    }

    // return responce
    return res.status(200).json(
        new apiResponse(
            200,
            deleteResponce,
            "video deleted successfully!!"
        )
    )
})

// toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new Apierror(400, "This video id is not valid")
    } 

     // find video in db
     const video = await Video.findById(
        {
            _id: videoId
        }
    )

    if(!video){
        throw new Apierror(404, "video not found")
    }

    if (video.Owner.toString() !== req.user._id.toString()) {
        throw new Apierror(403, "You don't have permission to toggle this video!")
    }

    // toggle video status
    video.isPublished = !video.isPublished

    await video.save({validateBeforeSave: false})

    //return responce 
    return res.status(200).json(
        new apiResponse(
            200,
            video,
            "video toggle successfully!!"
        )
    )
})

export {
    publishAVideo,
    updateVideo,
    getVideoById,
    deleteVideo,
    togglePublishStatus,
    getAllVideos
}
