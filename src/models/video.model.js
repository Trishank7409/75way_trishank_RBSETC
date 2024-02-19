import mongoose, { Schema } from 'mongoose'
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2'
const videoSchema=new mongoose.Schema({
    videoFile:{
        type:String,
        require:true,

    },
    thumbnail:{
        type:String,
        require:true
    },
    title:{
        type:String,
        require:true
    },
    description:{
        type:String,
        require:true
    },
    Duration:{
        type:Number,
        require:true
    },
    views:{
        type:Number,
        default:0
    },
    isPublished:{
        type:Boolean,
        default:true
    },
    Owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
     
    },
    isPaid: {
        type: Boolean,
        default: false 
    },
},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)

export const Video=mongoose.model("Video",videoSchema)