import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    userId: String,
    code: String,
    fullName: String,
    phone: String,
    address: String,
    longitude: Number,
    latitude: Number,
    note: String,
    items: [
      {
        productId: String,
        quantity: Number,
        price: Number,
        variant: [String],
        variantSelection: Array,
        image: String,
        name: String
      }
    ],
    subTotal: Number,
    coupon: String,
    discount: Number,
    total: Number,
    paymentMethod: {
      type: String,
      enum: [
        "money",
        "vnpay",
        "zalopay"
      ],
      default: "money"
    },
    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "paid",
        "refunded"
      ],
      default: "unpaid"
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "shipping",
        "completed",
        "cancelled",
        "returned"
      ],
      default: "pending",
    },
    shipping: {
      goshipOrderId: String,
      carrierName: String,
      carrierCode: String,
      fee: Number,
      cod: Number
    },
    usedPoint: {
      type: Number,
      default: 0
    },
    pointDiscount: {
      type: Number,
      default: 0
    },
    stockDeducted: {
      type: Boolean,
      default: false
    },
    pointAdded: {
      type: Boolean,
      default: false
    },
    deleted: {
      type: Boolean,
      default: false
    },
    deletedBy: String,
    deletedAt: Date
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model('Order', schema, "orders");

export default Order;