import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const totalVideos = await Video.countDocuments({ owner: userId });
    const totalSubscribers = await Subscription.countDocuments({ channel: userId });

    const videos = await Video.find({ owner: userId }, "_id");
    const videoIds = videos.map(v => v._id);

    const totalLikes = await Like.countDocuments({ video: { $in: videoIds } });
    const totalViews = await Video.aggregate([
        { $match: { owner: userId } },
        { $group: { _id: null, views: { $sum: "$views" } } }
    ]);

    res.status(200).json(new ApiResponse(200, {
        totalVideos,
        totalSubscribers,
        totalLikes,
        totalViews: totalViews[0]?.views || 0
    }, "Channel stats fetched"));
});

const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const videos = await Video.find({ owner: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    res.status(200).json(new ApiResponse(200, videos, "Channel videos fetched"));
});
export {
    getChannelStats,
    getChannelVideos
}