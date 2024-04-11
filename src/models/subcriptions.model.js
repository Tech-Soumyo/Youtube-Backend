import mongoose, { Schema } from "mongoose";

const subcriptionSchema = new Schema(
  {
    subcriber: {
      type: Schema.Types.ObjectId, // One who is subcribing or I am subscribing others
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId, // one to whom 'subcriber' is subcribing or Others are subscribing me
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subcription = mongoose.model("Subcription", subcriptionSchema);
