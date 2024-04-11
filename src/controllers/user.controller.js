import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/apierrors.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
const generateAccessAndRefreashToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreashToken = user.generaterefreashToken();

    user.refreashToken = refreashToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreashToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went Wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, username, password } = req.body;
  // console.log("email:", email);
  // console.log("passWord:", passWord);
  // validation - not empty

  // if(fullName === ""){
  //     throw new ApiError(400, "Fullname is required")
  // }
  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // check if user already exsits: username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username are already exists");
  }

  // check from images, check for avatar
  // console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload them to cloudnary, avatar
  const avatar = await uploadCloudinary(avatarLocalPath);
  const coverImage = await uploadCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // create user object - create entry in db

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // remove password and refresh token field from response
  const createUser = await User.findById(user._id).select(
    "-password -refreashToken"
  );

  // check for user creation
  if (!createUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // return res

  return res
    .status(201)
    .json(new ApiResponse(200, createUser, "User registerd Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  const { email, username, password } = req.body;
  console.log(email);

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  // username or email
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // find user
  if (!user) {
    throw new ApiError(404, "User is not registered");
  }

  // password check
  const isPasseordValid = await user.isPasswordcorrect(password);

  if (!isPasseordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }

  // access and refresh token
  const { accessToken, refreashToken } = await generateAccessAndRefreashToken(
    user._id
  );

  const loginInUser = await User.findById(user._id).select(
    "-password -refreashToken"
  );

  // send cookie
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreashToken", refreashToken, option)
    .json(
      new ApiResponse(200, {
        user: loginInUser,
        accessToken,
        refreashToken,
      })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreashToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreashToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingrefreashToken =
    req.cookies.refreashToken || req.body.refreashToken;

  if (!incomingrefreashToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingrefreashToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // checking refreashToken in Mongodb Database
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingrefreashToken !== user?.refreashToken) {
      throw new ApiError(401, "refreashToken is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreashToken } =
      await generateAccessAndrefreashToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreashToken", newRefreashToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreashToken: newRefreashToken },
          "AccessToken is Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordcorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, " Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Change Succesfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched succesfully");
});

const updateAccountDetails = asyncHandler(async (res, req) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All Fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const avatar = await uploadCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar on youtube");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar is updated successfully"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const CoverImageLocalPath = req.file?.path;
  if (!CoverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }

  const coverImage = await uploadCloudinary(CoverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading CoverImage on youtube");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image is  updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is Missing");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username?.toLowerCase() },
    },
    {
      $lookup: {
        from: "subcriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subcribers",
      },
    },
    {
      $lookup: {
        from: "subcriptions",
        localField: "_id",
        foreignField: "subcriber",
        as: "subcribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subcribers",
        },
        channelsSubscribedToCount: {
          $size: "$subcribedTo",
        },
        isSubcribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subcribers.subcriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubcribed: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
