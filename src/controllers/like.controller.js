import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const existingLike = await Like.findOne({ video: videoId, user: userId });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, null, "Video unliked"));
    }

    const newLike = await Like.create({ video: videoId, user: userId });
    res.status(201).json(new ApiResponse(201, newLike, "Video liked"));
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid comment ID");

    const existingLike = await Like.findOne({ comment: commentId, user: userId });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, null, "Comment unliked"));
    }

    const newLike = await Like.create({ comment: commentId, user: userId });
    res.status(201).json(new ApiResponse(201, newLike, "Comment liked"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const existingLike = await Like.findOne({ tweet: tweetId, user: userId });

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200).json(new ApiResponse(200, null, "Tweet unliked"));
    }

    const newLike = await Like.create({ tweet: tweetId, user: userId });
    res.status(201).json(new ApiResponse(201, newLike, "Tweet liked"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const likedVideoIds = await Like.find({ user: userId, video: { $exists: true } })
        .select("video");

    const videoIds = likedVideoIds.map(like => like.video);

    const videos = await mongoose.model("Video").find({ _id: { $in: videoIds } });

    res.status(200).json(new ApiResponse(200, videos, "Liked videos fetched"));
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}