import { Request, Response } from 'express';
import Order from '../../models/order.model';
import { pathAdmin } from '../../configs/variable.config';
import { Parser } from 'json2csv';
import { deductStockAfterSuccessfulOrder } from '../../helpers/order.helper';
import { addPointAfterPayment } from '../../helpers/point.helper';

export const list = async (req: Request, res: Response) => {
  const find: {
    deleted: boolean
  } = {
    deleted: false
  };

  const limitItems = 20;
  let page = 1;
  if(req.query.page) {
    const currentPage = parseInt(`${req.query.page}`);
    if(currentPage > 0) {
      page = currentPage;
    }
  }
  const totalRecord = await Order.countDocuments(find);
  const totalPage = Math.ceil(totalRecord/limitItems);
  const skip = (page - 1) * limitItems;
  const pagination = {
    skip: skip,
    totalRecord: totalRecord,
    totalPage: totalPage
  };

  const recordList = await Order
    .find(find)
    .limit(limitItems)
    .skip(skip)
    .sort({
      createdAt: "desc"
    });

  res.render("admin/pages/order-list", {
    pageTitle: "Quan ly don hang",
    recordList: recordList,
    pagination: pagination
  });
}

export const edit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    const orderDetail = await Order.findOne({
      _id: id,
      deleted: false
    });

    if(!orderDetail) {
      res.redirect(`/${pathAdmin}/order/list`);
      return;
    }

    res.render("admin/pages/order-edit", {
      pageTitle: "Chinh sua don hang",
      orderDetail: orderDetail
    });
  } catch (error) {
    console.log(error);
    res.redirect(`/${pathAdmin}/order/list`);
  }
}

export const editPatch = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { orderStatus, paymentStatus, note } = req.body;

    const order: any = await Order.findOne({
      _id: id,
      deleted: false
    });

    if (!order) {
      res.json({
        code: "error",
        message: "Don hang khong ton tai!"
      });
      return;
    }

    if (order.orderStatus === "completed" && orderStatus !== "completed") {
      res.json({
        code: "error",
        message: "Khong the thay doi trang thai don hang da hoan thanh!"
      });
      return;
    }

    if (order.paymentStatus === "paid" && paymentStatus === "unpaid") {
      res.json({
        code: "error",
        message: "Khong the chuyen don da thanh toan ve chua thanh toan!"
      });
      return;
    }

    order.orderStatus = orderStatus;
    order.paymentStatus = paymentStatus;
    order.note = note;

    const shouldDeductStock = !order.stockDeducted && (
      paymentStatus === "paid" ||
      ["confirmed", "shipping", "completed"].includes(orderStatus)
    );

    if (shouldDeductStock) {
      await deductStockAfterSuccessfulOrder(order);
    }

    if (paymentStatus === "paid") {
      await addPointAfterPayment(order);
    }

    await order.save();

    res.json({
      code: "success",
      message: "Cap nhat don hang thanh cong!"
    });
  } catch (error: any) {
    console.error(error);
    res.json({
      code: "error",
      message: error?.message || "Co loi xay ra, vui long thu lai!"
    });
  }
};

export const exportCSV = async (req: Request, res: Response) => {
  try {
    const orderList = await Order.find().lean();

    const parser = new Parser();
    let csv = parser.parse(orderList);
    csv = "\uFEFF" + csv;

    res.header("Content-Type", "text/csv");
    res.attachment("orders.csv");
    res.send(csv);
  } catch (err) {
    console.error("Export CSV error:", err);
  }
}