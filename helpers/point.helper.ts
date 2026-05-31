import { pointConfig } from "../configs/variable.config";
import AccountUser from "../models/account-user.model";
import Order from "../models/order.model";

export const addPointAfterPayment = async (orderOrCode: any) => {
  const order: any = typeof orderOrCode === "string"
    ? await Order.findOne({
        code: orderOrCode,
        deleted: false
      })
    : orderOrCode;

  if (!order || !order.userId || order.pointAdded) {
    return;
  }

  const pointEarned = Math.floor(order.total / pointConfig.MONEY_PER_POINT);
  if (pointEarned > 0) {
    await AccountUser.updateOne(
      {
        _id: order.userId,
        deleted: false,
        status: "active"
      },
      {
        $inc: {
          totalPoint: pointEarned
        }
      }
    );
  }

  order.pointAdded = true;
};