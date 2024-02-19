import { Apierror } from "../utils/apiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { apiResponse } from "../utils/apiResponse.js"

// create playlist
const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if((!name || name?.trim()==="") || (!description || description?.trim()==="")){
        throw new Apierror(400, "name and description both are required")
    }

    // creating playlist 
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id
    })

    if(!playlist){
        throw new Apierror(500, "something went wrong while creating playlist")
    }

    // return responce
    return res.status(201).json(
        new apiResponse(200, playlist, "playlist created successfully!!")
    );
})

// get user playlists by userId
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    if(!isValidObjectId(userId)){
        throw new Apierror(400, "This user id is not valid")
    }

    // find user in database 
    const user = await User.findById(userId)
    if (!user) {
        throw new Apierror(404, "User not found");
    }

    // match and find all playlist
    const playlists = await Playlist.aggregate([
        {
            $match:{
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videos", 
            }
        },
        {
            $addFields:{
                playlist:{
                    $first: "$videos"
                }
            }
        }
    ])

    if(!playlists){
        throw new Apierror(500, "something went wrong while fetching playlists")
    }

    // return responce
    return res.status(201).json(
        new apiResponse(200, playlists, "playlists fetched  successfully!!"))
})

// get playlist by id 
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    console.log("playlistId",playlistId)
    if(!isValidObjectId(playlistId)){
        throw new Apierror(400, "This playlist id is not valid")
    }

    // find user in database 
    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new Apierror(404, "playlist not found");
    }

    if(!playlist){
        throw new Apierror(500, "something went wrong while fetching playlist")
    }

     // return responce
     return res.status(201).json(
        new apiResponse(200, playlist, "playlist fetched  successfully!!"))
})


// add video to playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!isValidObjectId(playlistId)){
        throw new Apierror(400, "This playlist id is not valid")
    }

    if(!isValidObjectId(videoId)){
        throw new Apierror(400, "This video id is not valid")
    }
// find playlist in db
    const playlist = await Playlist.findById( playlistId )

    if (!playlist) {
        throw new Apierror(404, "no playlist found!");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new Apierror(403, "You don't have permission to add video in this playlist!");
    }

    // find video in db
    const video = await Video.findById( videoId )

    if (!video) {
        throw new Apierror(404, "no video found!");
    }

    // if video already exists in playlist 
    if(playlist.video.includes(videoId)){
        throw new Apierror(400, "video already exists in this playlist!!");
    }

    // push video to playlist
  const addedToPlaylist =   await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $push:{
                video: videoId
            }
        },
        {
            new: true
        }
    )

    if(!addedToPlaylist){
        throw new Apierror(500, "something went wrong while added video to playlist !!");
    }

    // return responce
    return res.status(201).json(
        new apiResponse(200, addedToPlaylist, " added video in playlist successfully!!"))
})

// remove video to playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params

    if(!isValidObjectId(playlistId)){
        throw new Apierror(400, "This playlist id is not valid")
    }

    if(!isValidObjectId(videoId)){
        throw new Apierror(400, "This video id is not valid")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new Apierror(404, "no playlist found!");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new Apierror(403, "You don't have permission to remove video in this playlist!");
    }

    // find video in db
    const video = await Video.findById(videoId)

    if (!video) {
        throw new Apierror(404, "no video found!");
    }

    // if video exists or not in playlist 
    if(!playlist.video.includes(videoId)){
        throw new Apierror(400, "video not exists in this playlist!!");
    }

    // remove video in the playlist 
    const removeVideoToPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull:{
                video: videoId
            }
        },
        {
            new: true
        }
    )

    if(!removeVideoToPlaylist){
        throw new Apierror(500, "something went wrong while removed video to playlist !!");
    }

    // return responce 
    return res.status(201).json(
        new apiResponse(200, removeVideoToPlaylist, "removed video in playlist successfully!!"))
})

// delete playlist
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params

    if(!isValidObjectId(playlistId)){
        throw new Apierror(400, "This playlist id is not valid")
    }

    const playlist = await Playlist.findById(playlistId)

    console.log("playlist", playlist)

    if (!playlist) {
        throw new Apierror(404, "no playlist found!");
    }

    if (playlist.owner.toString() !== req.user._id.toString()) {
        throw new Apierror(403, "You don't have permission to delete this playlist!");
    }

    const deletePlaylist = await Playlist.deleteOne({
        _id: playlistId
    })


    if(!deletePlaylist){
        throw new Apierror(500, "something went wrong while deleting playlist")
    }

    // return responce
    return res.status(201).json(
        new apiResponse(200, deletePlaylist, "playlist deleted successfully!!"))
})

// update playlist
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const {NewName, NewDescription} = req.body

    if(!isValidObjectId(playlistId)){
        throw new Apierror(400, "This playlist id is not valid")
    }
    // if any one is provided
    if (!((!NewName || NewName?.trim() === "") || (!NewDescription || NewDescription?.trim() === ""))) {
        throw new Apierror(400, "Either name or description is required");
    } else {
        const playlist = await Playlist.findById(playlistId)

        if (playlist.owner.toString() !== req.user._id.toString()) {
            throw new Apierror(403, "You don't have permission to update this playlist!");
        }

        const updatePlaylist = await Playlist.findByIdAndUpdate(
            playlistId,
            {
                $set:{
                    name: NewName,
                    description: NewDescription
                }
            },
            {
                new: true
            }
        )

        if(!updatePlaylist){
            throw new ApiError(500, "something went wrong while updating playlist!!")
        }

        // return responce
        return res.status(201).json(
        new apiResponse(200, updatePlaylist, "playlist updated successfully!!"))
    }
})





export {
    createPlaylist,
    getUserPlaylists,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    addVideoToPlaylist,
    getPlaylistById,
}