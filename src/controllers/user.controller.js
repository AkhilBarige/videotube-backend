
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloud, deletefromcloud } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) throw new ApiError(401, "no user found");
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken; // or user.refreshtoken, but be consistent
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "error in generating tokens");
    }
};

const registeruser = asyncHandler(async (req, res, next) => {
    // 1. Create the user (your existing logic here)
    const { fullname, username, email, password } = req.body;
    const avatar = req.files?.avatar?.[0]?.path; // adjust if your upload logic is different

    if (!fullname || !username || !email || !password || !avatar) {
        return res.status(400).json({ message: "All fields including avatar are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({
        fullname,
        username,
        email,
        password,
        avatar
    });

    // 2. Generate tokens
    const accessToken = jwt.sign(
        { userId: user._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    // 3. Store refreshToken in DB
    user.refreshToken = refreshToken;
    await user.save();

    // 4. Set refreshToken as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    });

    // 5. Respond with accessToken and user info
    res.status(200).json({
        statusCode: 200,
        message: "user created",
        data: {
            user: {
                _id: user._id,
                fullname: user.fullname,
                username: user.username,
                email: user.email,
                avatar: user.avatar
            },
            accessToken
        },
        success: true
    });
});

const logInuser = asyncHandler(async (req, res) => {

    const { email, username, password } = req.body || {};
    if (!password || (!email && !username)) {
        throw new ApiError(400, "Provide password and either email or username");
    }


    const query = email
        ? { email }
        : { username: String(username).toLowerCase() };

    const user = await User.findOne(query);
    if (!user) {

        throw new ApiError(401, "Invalid credentials");
    }


    const valid = await user.isPasswordCorrect(password);
    if (!valid) {
        console.log(bcrypt.compare(password, user.password), "wrog pass")
        throw new ApiError(401, "Invalid credentials");
    }


    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );


    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });


    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000

    };

    const safeUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, { user: safeUser, accessToken }, "login successful")
        );
});

const refreshAccessToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing" });
        }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        const user = await User.findById(decoded._id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        res.json({ accessToken });
    } catch (error) {
        next(error);
    }
};

const logOut = asyncHandler(async (req, res, next) => {
    if (!req.user?._id) {
        return res.status(401).json({ message: "User not authenticated" });
    }

    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: false }
    );

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    };

    res
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .status(200)
        .json({ statusCode: 200, message: "User logged out", data: {}, success: true });
});
const changeCurrentPassword = asyncHandler(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "Both old and new passwords are required" });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
        return res.status(401).json({ message: "Old password is incorrect" });
    }

    const isSame = await user.comparePassword(newPassword);
    if (isSame) {
        return res.status(400).json({ message: "New password must be different from old password" });
    }

    user.password = newPassword;
    user.refreshToken = undefined;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
});
const getCurrentUser = asyncHandler(async (req, res) => {

    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "current user details"))

})
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(404, "no url found")
    }
    const avatar = await uploadOnCloud(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(401, "no such file")
    }
    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        }, { new: true }
    ).select("-password -refreshtoken")
    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "avatar updated and done"))

})
const updateUserCoverimg = asyncHandler(async (req, res) => {
    const coverLocalPath = req.file?.path
    if (!coverLocalPath) {
        throw new ApiError(404, "no url found")
    }
    const coverimg = await uploadOnCloud(coverLocalPath)
    if (!coverimg.url) {
        throw new ApiError(401, "no such file")
    }
    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                coverImage: coverimg.url
            }
        }, { new: true }
    ).select("-password -refreshtoken")
    return res
        .status(200).json(
            new ApiResponse(200, user, "cover image updated and done"))



})
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { email, fullname } = req.body

    if (!fullname || fullname.trim().length < 5) {
        return res
            .status(400)
            .json({ message: "Fullname is required and must be at least 3 characters." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res
            .status(400)
            .json({ message: "A valid email address is required." });
    }

    const user = await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                fullname, email
            }
        }, { new: true }
    ).select("-password -refreshtoken")

    return res.status(200, new ApiResponse(200, user, "updates are done"))

})
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params
    console.log("Searching for username:", username);


    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([

        {
            $match: {

                username: username.trim().toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])
    console.log("Searching for username:", username.trim().toLowerCase());
    console.log("Aggregation result:", channel);
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )

})



const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})
export { registeruser, logInuser, refreshAccessToken, logOut, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverimg, getUserChannelProfile, getWatchHistory }