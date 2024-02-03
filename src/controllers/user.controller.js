import {asyncHandler} from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/apierrors.js";
import { User } from "../models/user.model.js";
import { uploadCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req, res) =>{
  // get user details from frontend
  const { fullName, email, userName, passWord } = req.body;
  console.log("email:", email);
  console.log("passWord:", passWord);
  // validation - not empty

  // if(fullName === ""){
  //     throw new ApiError(400, "Fullname is     required")
  // }
  if (
    [fullName, email, passWord, userName].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are    required");
  }

  // check if user already exsits: username, email
  const existedUser = User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username are already exists");
  }

  // check from images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

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
    passWord,
    userName: userName.toLowerCase(),
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

  return res.status(201).json(
   new ApiResponse(200, createUser, "User registerd Successfully")
  )
})

export {registerUser}
 