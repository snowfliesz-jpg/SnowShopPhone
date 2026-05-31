import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    folder: String,
    filename: String,
    mimetype: String,
    size: Number
  },
  {
    timestamps: true, // Tự động sinh ra trường createdAt và updatedAt
  }
);

const Media = mongoose.model('Media', schema, "media");

export default Media;