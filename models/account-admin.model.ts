import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    fullName: String,
    email: String,
    password: String,
    roles: [String],
    status: {
      type: String,
      enum: ["initial", "active", "inactive"], // initial - Khởi tạo, active – Hoạt động, inactive – Tạm dừng
      default: "initial"
    },
    avatar: String,
    search: String,
    lastLoginAt: Date, // Thời gian đăng nhập gần nhất
    deleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
  },
  {
    timestamps: true, // Tự động sinh ra trường createdAt và updatedAt
  }
);

const AccountAdmin = mongoose.model('AccountAdmin', schema, "accounts-admin");

export default AccountAdmin;