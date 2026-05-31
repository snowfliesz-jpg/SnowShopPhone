import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: String,
    description: String,
    permissions: [String],
    status: {
      type: String,
      enum: ["active", "inactive"], // active – Hoạt động, inactive – Tạm dừng
      default: "inactive"
    },
    search: String,
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  },
  {
    timestamps: true, // Tự động sinh ra trường createdAt và updatedAt
  }
);

const Role = mongoose.model('Role', schema, "roles");

export default Role;