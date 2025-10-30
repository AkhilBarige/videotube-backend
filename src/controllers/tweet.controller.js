import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content, media } = req.body;

    if (!content) throw new ApiError(400, "Tweet content is required");

    const tweet = await Tweet.create({
        content,
        media,
        owner: req.user._id
    });

    res.status(201).json(new ApiResponse(201, tweet, "Tweet created"));
});

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid user ID");

    const tweets = await Tweet.find({ owner: userId })
        .sort({ createdAt: -1 })
        .populate("owner", "username avatar");

    res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content, media } = req.body;

    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID");

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (!tweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "You can only update your own tweets");
    }

    tweet.content = content || tweet.content;
    tweet.media = media || tweet.media;

    await tweet.save();

    res.status(200).json(new ApiResponse(200, tweet, "Tweet updated"));
});


const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweet ID");

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) throw new ApiError(404, "Tweet not found");

    if (!tweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "You can only delete your own tweets");
    }

    await Tweet.findByIdAndDelete(tweetId);

    res.status(200).json(new ApiResponse(200, null, "Tweet deleted"));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}