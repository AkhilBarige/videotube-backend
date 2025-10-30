import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const comments = await Comment.find({ video: videoId })
        .populate("owner", "username avatar")
        .populate({
            path: "replies",
            populate: { path: "owner", select: "username avatar" }
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    res.status(200).json(new ApiResponse(200, comments, "Comments fetched"));
});

const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { videoId } = req.params;

    if (!content) throw new ApiError(400, "Comment content is required");

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    });

    res.status(201).json(new ApiResponse(201, comment, "Comment added"));
});


const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "You can only edit your own comments");
    }

    comment.content = content || comment.content;
    await comment.save();

    res.status(200).json(new ApiResponse(200, comment, "Comment updated"));
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ApiError(404, "Comment not found");

    if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "You can only delete your own comments");
    }

    await Comment.findByIdAndDelete(commentId);

    res.status(200).json(new ApiResponse(200, null, "Comment deleted"));
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}