import { Router } from 'express';
import { Video } from '../models/video.model.js';
import { User } from '../models/user.model.js';
import { deleteVideo, getAllVideos, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js"; // Import verifyJWT middleware
import { upload } from "../middleware/multer.js";
import { Apierror } from "../utils/apiError.js"; // Import Apierror for error handling
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// Route to get a video by ID
router.get("/:videoId", asyncHandler(async (req, res) => {
    try {
        const video = await Video.findById(req.params.videoId);
        if (!video) {
            throw new Apierror(404, "Video not found");
        }
    
        // Check if the video is paid and the user has not purchased access
        if (video.isPaid && !req.user.purchasedVideos.includes(video._id)) {
            throw new Apierror(403, "You don't have access to this paid video.");
        }
    
        // Return the video data
        res.status(200).json(video);
    } catch (error) {
        // Handle errors
        console.error("Error:", error);
        throw new Apierror(500, "Internal Server Error");
    }
}));

// Route to get all videos
router.route("/")
    .get(getAllVideos)
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
        ]),
        publishAVideo
    );

// Route to delete a video by ID
router.delete("/:videoId", deleteVideo);

// Route to update a video by ID
router.patch("/:videoId", upload.single("thumbnail"), updateVideo);

// Route to toggle publish status of a video by ID
router.patch("/toggle/publish/:videoId", togglePublishStatus);

export default router;
