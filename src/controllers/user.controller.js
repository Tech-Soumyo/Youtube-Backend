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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
