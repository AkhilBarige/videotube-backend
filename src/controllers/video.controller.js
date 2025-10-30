import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloud } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

    const filter = {
        isPublished: true,
        ...(userId && { owner: userId }),
        ...(query && { title: { $regex: query, $options: "i" } })
    };

    const sortOptions = { [sortBy]: sortType === "asc" ? 1 : -1 };

    const videos = await Video.find(filter)
        .populate("owner", "username avatar")
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Video.countDocuments(filter);

    res.status(200).json(new ApiResponse(200, { videos, total }, "Videos fetched"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!req.files || !req.files.video) {
        throw new ApiError(400, "Video file is required");
    }

    const videoUpload = await uploadOnCloud(req.files.video.tempFilePath);
    const thumbnailUpload = req.files.thumbnail
        ? await uploadOnCloud(req.files.thumbnail.tempFilePath)
        : null;

    const video = await Video.create({
        title,
        description,
        videoFile: videoUpload.secure_url,
        thumbnail: thumbnailUpload?.secure_url || "",
        owner: req.user._id
    });

    res.status(201).json(new ApiResponse(201, video, "Video published"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid video ID");

    const video = await Video.findById(videoId).populate("owner", "username avatar");

    if (!video) throw new ApiError(404, "Video not found");

    res.status(200).json(new ApiResponse(200, video, "Video fetched"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "You can only update your own videos");
    }

    if (req.files?.thumbnail) {
        const thumbnailUpload = await uploadOnCloud(req.files.thumbnail.tempFilePath);
        video.thumbnail = thumbnailUpload.secure_url;
    }

    video.title = title || video.title;
    video.description = description || video.description;

    await video.save();

    res.status(200).json(new ApiResponse(200, video, "Video updated"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "You can only delete your own videos");
    }

    await Video.findByIdAndDelete(videoId);

    res.status(200).json(new ApiResponse(200, null, "Video deleted"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}