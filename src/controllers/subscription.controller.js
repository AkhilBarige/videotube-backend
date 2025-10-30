import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.models.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user._id;

    if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel ID");
    if (userId.equals(channelId)) throw new ApiError(400, "You cannot subscribe to yourself");

    const existing = await Subscription.findOne({ subscriber: userId, channel: channelId });

    if (existing) {
        await Subscription.findByIdAndDelete(existing._id);
        return res.status(200).json(new ApiResponse(200, null, "Unsubscribed"));
    }

    const sub = await Subscription.create({ subscriber: userId, channel: channelId });
    res.status(201).json(new ApiResponse(201, sub, "Subscribed"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid channel ID");

    const subscribers = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username avatar");

    res.status(200).json(new ApiResponse(200, subscribers, "Channel subscribers fetched"));
});


const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) throw new ApiError(400, "Invalid subscriber ID");

    const channels = await Subscription.find({ subscriber: subscriberId })
        .populate("channel", "username avatar");

    res.status(200).json(new ApiResponse(200, channels, "Subscribed channels fetched"));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}