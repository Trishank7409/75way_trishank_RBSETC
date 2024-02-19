import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

import Jwt from "jsonwebtoken";
import mongoose from "mongoose";

// method for generaing token
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      userId: user._id,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw new Apierror(
      500, //error.message||//
      "something Went wrong while grnerating the token"
    );
  }
};

// user registration

const registerUser = asyncHandler(async (req, res) => {


  const { fullname, email, username, password } = req.body;


  if (
    [fullname, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new Apierror(400, "All fields are required");
  }

  //    validation from db
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  console.log("this is existed user:", existedUser);

  if (existedUser) {
    throw new Apierror(409, "User already exist");
  }
  // file handling

  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  console.log("This is req.file:", req.files);

  // verify image and avatar is uploaded or not

  if (!avatarLocalPath) {
    throw new Apierror(400, "Avatar image path is required");
  }

  // upload file on cloudinary

  const avatar = await uploadCloudinary(avatarLocalPath);

  const coverImage = await uploadCloudinary(coverImageLocalPath);

  // again verify avatar is uploaded tocloudiary?
  if (!avatar) {
    throw new Apierror(400, "Avatar image is not uploaded to cloudinary");
  }

  // // make entry on DB as object

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });
  // // check user is created or not by finding him and remove password and refresh token

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new Apierror(500, "user is not created");
  }

  // // return response

  res
    .status(200)
    .json(new apiResponse(200, createdUser, "User Created successfully"));
});

// Login user

const loginUser = asyncHandler(async (req, res) => {


  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new Apierror(400, "username or email is required");
  }

  // find the user based on the credentials

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // if user is not found throw error

  if (!user) {
    throw new Apierror(400, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new Apierror(401, "invalid password");
  }

  // get access tken and refresh token from the method

  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  // make user logged in and logout
  const loggedInUser = User.findById(user._id).select(
    "-password -refreshToken"
  );
  const userResponse = {
    _id: loggedInUser._id,
    username: loggedInUser.username,
    email: loggedInUser.email,
    fullname: loggedInUser.fullname,
    // Add any other fields you need
  };
  // send cookies
  const option = {
    httpOnly: true,
    secure: true,
  };

  // return response
  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new apiResponse(
        200,
        {
          user: userResponse,
          accessToken,
          refreshToken,
        },
        "user logged In successfully"
      )
    );
});

// logged out user
const loggedOutUser = asyncHandler(async (req, res) => {
    try {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1,
                },
            },
            {
                new: true,
            }
        );

        const option = {
            httpOnly: true,
            secure: true,
        };
        return res
            .status(200)
            .clearCookie("accessToken", option)
            .clearCookie("refreshToken", option)
            .json(new apiResponse(200, {}, "User logged out"));
    } catch (error) {
        console.log("Error occurred while logging out", error);
    }
});


// making end point to make refresh access token point on hitting api

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new Apierror(401, "invalid request");
  }
  // validate refresh token
  try {
    const decodedToken = Jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // geting user detail
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new Apierror(401, "user not found by decoded token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new Apierror(401, "Refresh token expire");
    }

    const option = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json(
        new apiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new Apierror(400, error?.message || "Error in decoding token");
  }
});

// Change current Password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  const user = await User.findById(req.user._id);
  // console.log("User ID:", req.user);
  if (!user) {
    throw new Apierror(404, "User not found");
  }
  const ispasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!ispasswordCorrect) {
    throw new Apierror(401, "invalid password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  res.status(200).json(new apiResponse(200, {}, "password changed"));
});

// Get current user

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken"
  );
  res.status(200).json(new apiResponse(200, user, "user fetched"));
});

// update account detail

const updateAccountDetail = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!(fullname || email)) {
    throw new Apierror(400, "please provide at least one field to update");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password ");

  return res.status(200).json(new apiResponse(200, user, "user updated"));
});

// update files

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new Apierror(400, "Avatar File is Missing");
  }

  const avatar = await uploadCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new Apierror(400, "Avatar image is not uploaded to cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password ");
  return res.status(200).json(new apiResponse(200, user, "user updated"));
});

// update coverimage
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new Apierror(400, "Cover Image File is Missing");
  }

  const coverIMage = await uploadCloudinary(coverImageLocalPath);

  if (!coverIMage.url) {
    throw new Apierror(400, "cover image is not uploaded to cloudinary");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverIMage.url,
      },
    },
    { new: true }
  ).select("-password ");
  return res.status(200).json(new apiResponse(200, user, "user updated"));
});

// Get user channelprofile

const getChannelUserProfile = asyncHandler(async (req, res) => {
  const username = req.params;

  if (!username?.trim()) {
    throw new Apierror(400, "username is required");
  }
  const channel = await User.aggregate([
      {
       $match: { username: username?.toLowerCase() } 
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        }
      },
      {
        $addFields:{
            subscribersCount:{
                $size: "$subscribers"
            },
            channelsSubscribedToCount:{
                $size: "$subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false
                }
            } 
        }
      },
      {
        $project: {
          _id: 1,
          username: 1,
          fullname: 1,
          email: 1,
          avatar: 1,
          coverImage: 1,
          isSubscribed: 1,
          subscribersCount: 1,
          channelsSubscribedToCount: 1,
        },
      }
  ]);
  if(!channel?.length){
    throw new Apierror(404, "channel not found");
  }
  return res.status(200).json(new apiResponse(200, channel[0], "user fetched"));
});

// GEt user watch history

// const getwatchHistory=asyncHandler(async(req,res)=>{
//   const user=await User.aggregate([
//     {
//       $match: {
//           _id:new mongoose.Types.ObjectId(req.user?._id)
//           }
//   },
//   {
//     $lookup: {
//       from: "videos",
//       localField: "watchHistory",
//       foreignField: "_id",
//       as: "watchHistory",
//       pipeline:[
//         {
//           $lookup:{
//             from: "users",
//             localField: "owner",
//             foreignField: "_id",
//             as: "owner",
//             pipeline:[
//               {
//                 $project:{
//                   fullname:1,
//                   username:1,
//                   avatar:1

//                 }
//               }
//             ]
//           }
//         },
//         {
//           $addFields:{
//             owner:{
//               $arrayElemAt:["$owner",0]
//             }
//           }
//         }
//       ]
//     }
//   }

//   ])

//   return res
  
//  .status(200)
//  .json(new apiResponse(
//   200,
//   user[0].watchHistory,
//   "watch History fetched"
//  ));

// })


export {
  registerUser,
  loginUser,
  loggedOutUser,
  refreshAccessToken,
  getCurrentUser,
  changeCurrentPassword,
  updateAccountDetail,
  updateCoverImage,
  updateUserAvatar,
  getChannelUserProfile,
//   getwatchHistory
};
