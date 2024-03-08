import { asyncHandler } from "../utils/asyncHandlers";
import { ApiError } from "../utils/apierrors";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
// import { verify } from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", "");

    if (!token) {
      throw new ApiError(401, "UnAuthorized request");
    }

    //   JWT verify
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    //   check User by Decoding the token
    const user = await User.findById(decodedToken?._id).select(
      " -password -refreashToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }

    req.User = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
