import { Request, Response } from 'express';
import { generateRandomNumber, generateRandomString } from '../../helpers/generate.helper';
import Order from '../../models/order.model';
import Product from '../../models/product.model';
import AttributeProduct from '../../models/attribute-product.model';
import Coupon from '../../models/coupon.model';
import { getInfoAddress } from '../../helpers/location.helper';
import axios from 'axios';
import moment from 'moment';
import hmacSHA256 from 'crypto-js/hmac-sha256';
import { renderFile } from 'pug';
import puppeteer from 'puppeteer';
import fs from "fs";
import { addPointAfterPayment } from '../../helpers/point.helper';
import { deductStockAfterSuccessfulOrder } from '../../helpers/order.helper';
import { pointConfig } from '../../configs/variable.config';
import AccountUser from '../../models/account-user.model';
import { getApiPayment, getApiShipping, getGeneral } from '../../configs/setting.config';

export const createPost = async (req: Request, res: Response) => {
  const dataFinal: any = {};

  dataFinal.userId = res.locals.accountUser.id || "";

  let code = "";
  let existCode = true;
  while (existCode) {
    code = generateRandomString(2).toUpperCase() + generateRandomNumber(6);
    const existOrderCode = await Order.findOne({
      code: code
    });
    if (!existOrderCode) {
      existCode = false;
    }
  }
  dataFinal.code = code;

  dataFinal.fullName = req.body.fullName;
  dataFinal.phone = req.body.phone;
  dataFinal.address = req.body.address;
  dataFinal.longitude = req.body.longitude;
  dataFinal.latitude = req.body.latitude;
  dataFinal.note = req.body.note;
  dataFinal.coupon = req.body.coupon;
  dataFinal.paymentMethod = req.body.paymentMethod;
  dataFinal.paymentStatus = "unpaid";
  dataFinal.orderStatus = "pending";

  dataFinal.items = [];
  for (const item of req.body.items) {
    const quantity = parseInt(`${item.quantity}`) || 0;
    if (quantity <= 0) {
      continue;
    }

    const productDetail: any = await Product.findOne({
      _id: item.productId,
      deleted: false,
      status: "active"
    });

    if (!productDetail) {
      continue;
    }

    const productStock = Array.isArray(productDetail.variants) && productDetail.variants.length > 0
      ? productDetail.variants.reduce((total: number, variantItem: any) => total + (Number(variantItem.stock) || 0), 0)
      : (Number(productDetail.stock) || 0);
    if (productStock < quantity) {
      res.json({
        code: "error",
        message: `San pham ${productDetail.name} khong du so luong ton kho!`,
      });
      return;
    }

    let price = 0;
    const variant: string[] = [];
    let variantSelection: any[] | undefined = undefined;

    if (item.variant) {
      const variantMatched: any = productDetail.variants.find((variantItem: any) => {
        return variantItem.attributeValue.every((attr: any) => {
          const selected = item.variant.find((v: any) => v.attrId === attr.attrId);
          return selected && selected.value === attr.value;
        });
      });

      if (!variantMatched) {
        res.json({
          code: "error",
          message: `Khong tim thay bien the hop le cua san pham ${productDetail.name}!`,
        });
        return;
      }

      const variantStock = Number(variantMatched.stock) || 0;
      if (variantStock < quantity) {
        res.json({
          code: "error",
          message: `Bien the cua san pham ${productDetail.name} khong du so luong ton kho!`,
        });
        return;
      }

      price = variantMatched.priceNew || variantMatched.priceOld || 0;
      variantSelection = item.variant.map((v: any) => ({
        attrId: `${v.attrId}`,
        value: `${v.value}`,
        label: `${v.label}`
      }));

      for (const v of item.variant) {
        const attribute: any = await AttributeProduct
          .findOne({
            _id: v.attrId
          })
          .select("name")
          .lean();
        if (attribute) {
          variant.push(`${attribute.name}: ${v.label}`);
        }
      }
    } else {
      price = productDetail.priceNew || 0;
    }

    dataFinal.items.push({
      productId: item.productId,
      quantity: quantity,
      price: price,
      variant: variant.length > 0 ? variant : undefined,
      variantSelection: variantSelection,
      image: productDetail.images[0],
      name: productDetail.name
    });
  }

  dataFinal.subTotal = dataFinal.items.reduce((total: number, item: any) => total + (item.price * item.quantity), 0);

  dataFinal.discount = 0;
  if(req.body.coupon) {
    const couponDetail: any = await Coupon.findOne({
      code: req.body.coupon.trim(),
      deleted: false,
      status: "active"
    });
    if (!couponDetail) {
      res.json({
        code: "error",
        message: "Ma giam gia khong ton tai!",
      });
      return;
    }

    const now = new Date();
    if (couponDetail.startDate && now < couponDetail.startDate) {
      res.json({
        code: "error",
        message: "Ma giam gia chua bat dau!",
      });
      return;
    }

    if (couponDetail.endDate && now > couponDetail.endDate) {
      res.json({
        code: "error",
        message: "Ma giam gia da het han!",
      });
      return;
    }

    if (
      couponDetail.usageLimit &&
      couponDetail.usedCount >= couponDetail.usageLimit
    ) {
      res.json({
        code: "error",
        message: "Ma giam gia da het!",
      });
      return;
    }

    if (dataFinal.subTotal >= couponDetail.minOrderValue) {
      if (couponDetail.typeDiscount === "percentage") {
        dataFinal.discount = (dataFinal.subTotal * couponDetail.value) / 100;

        if (couponDetail.maxDiscountValue > 0 && dataFinal.discount > couponDetail.maxDiscountValue) {
          dataFinal.discount = couponDetail.maxDiscountValue;
        }

      } else if (couponDetail.typeDiscount === "fixed") {
        dataFinal.discount = couponDetail.value;
      }

      await Coupon.updateOne({
        _id: couponDetail.id,
        deleted: false,
        status: "active"
      }, {
        usedCount: couponDetail.usedCount + 1
      });
    } else {
      res.json({
        code: "error",
        message: `Don hang chua dat gia tri toi thieu: ${couponDetail.minOrderValue}d de ap dung ma giam gia.`,
      });
      return;
    }
  }

  const shopLocation = {
    lat: 10.8037448,
    lng: 106.6617749
  };

  const shopInfoAddress = await getInfoAddress(shopLocation.lat, shopLocation.lng);
  const userInfoAddress = await getInfoAddress(dataFinal.latitude, dataFinal.longitude);
  const totalWeight = dataFinal.items.reduce((total: number, item: any) => total + item.quantity * 500, 0);

  const dataGoShip = {
    shipment: {
      rate: req.body.shippingMethod,
      payer: 0,
      address_from: {
        name: "Nguyen Van A",
        phone: "0912345678",
        street: "11 Su Van Hanh, Phuong 12, Quan 10, Thanh pho Ho Chi Minh 700000, Viet Nam",
        city: shopInfoAddress.city,
        district: shopInfoAddress.district,
        ward: shopInfoAddress.ward
      },
      address_to: {
        name: dataFinal.fullName,
        phone: dataFinal.phone,
        street: dataFinal.address,
        city: userInfoAddress.city,
        district: userInfoAddress.district,
        ward: userInfoAddress.ward
      },
      parcel: {
        cod: `${dataFinal.subTotal - dataFinal.discount}`,
        amount: `${dataFinal.subTotal - dataFinal.discount}`,
        weight: `${totalWeight}`,
        width: "10",
        height: "10",
        length: "10",
        metadata: "Hang de vo, vui long nhe tay."
      }
    }
  };

  const apiShipping = await getApiShipping();

  const goshipRes = await axios.post("https://sandbox.goship.io/api/v2/shipments", dataGoShip, {
    headers: {
      Authorization: `Bearer ${apiShipping.tokenGoShip}`,
      "Content-Type": "application/json"
    }
  });

  dataFinal.shipping = {
    goshipOrderId: goshipRes.data.id,
    carrierName: goshipRes.data.carrier,
    carrierCode: goshipRes.data.carrier_short_name,
    fee: goshipRes.data.fee,
    cod: goshipRes.data.cod,
  };

  dataFinal.usedPoint = 0;
  dataFinal.pointDiscount = 0;
  if(res.locals.accountUser) {
    dataFinal.usedPoint = res.locals.accountUser.totalPoint - res.locals.accountUser.usedPoint;
    dataFinal.pointDiscount = dataFinal.usedPoint * pointConfig.POINT_TO_MONEY;
  }

  dataFinal.total = dataFinal.subTotal + dataFinal.shipping.fee - dataFinal.discount - dataFinal.pointDiscount;

  const newRecord: any = new Order(dataFinal);
  await newRecord.save();

  if(dataFinal.paymentMethod === "money") {
    await deductStockAfterSuccessfulOrder(newRecord);
    await newRecord.save();
  }

  if(res.locals.accountUser) {
    await AccountUser.updateOne({
      _id: res.locals.accountUser.id
    }, {
      usedPoint: res.locals.accountUser.totalPoint
    });
  }

  res.json({
    code: "success",
    message: "Dat hang thanh cong!",
    orderCode: dataFinal.code,
    phone: dataFinal.phone
  });
}

export const success = async (req: Request, res: Response) => {
  const { orderCode, phone } = req.query;

  if(!orderCode || !phone) {
    res.redirect("/");
    return;
  }

  const orderDetail: any = await Order.findOne({
    code: orderCode,
    phone: phone,
    deleted: false
  });

  if(!orderDetail) {
    res.redirect("/");
    return;
  }

  res.render("client/pages/order-success", {
    pageTitle: "Dat hang thanh cong!",
    orderCode: orderCode,
    phone: phone
  });
}

export const paymentZaloPay = async (req: Request, res: Response) => {
  const { orderCode, phone } = req.query;

  const orderDetail = await Order.findOne({
    code: orderCode,
    phone: phone,
    deleted: false
  });

  if(!orderDetail) {
    res.redirect("/");
    return;
  }

  const apiPayment = await getApiPayment();

  const config = {
    app_id: `${apiPayment.zaloPayAppId}`,
    key1: `${apiPayment.zaloPayKey1}`,
    key2: `${apiPayment.zaloPayKey2}`,
    endpoint: `${apiPayment.zaloPayDomain}/v2/create`
  };

  const settingGeneral = await getGeneral();

  const embed_data = {
    redirecturl: `${settingGeneral.domainWebsite}/order/success?orderCode=${orderCode}&phone=${phone}`
  };

  const items = [{}];
  const transID = Math.floor(Math.random() * 1000000);
  const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format('YYMMDD')}_${transID}`,
    app_user: `${phone}-${orderCode}`,
    app_time: Date.now(),
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount: orderDetail.total,
    description: `Thanh toan don hang ${orderCode}`,
    bank_code: "",
    mac: "",
    callback_url: `${settingGeneral.domainWebsite}/order/payment-zalopay-result`
  };

  const data = config.app_id + "|" + order.app_trans_id + "|" + order.app_user + "|" + order.amount + "|" + order.app_time + "|" + order.embed_data + "|" + order.item;
  order.mac = hmacSHA256(data, config.key1).toString();

  const response = await axios.post(config.endpoint, null, { params: order });
  res.redirect(response.data.order_url);
}

export const paymentZalopayResult = async (req: Request, res: Response) => {
  const apiPayment = await getApiPayment();

  const config = {
    key2: `${apiPayment.zaloPayKey2}`
  };

  let result: any = {};

  try {
    const dataStr = req.body.data;
    const reqMac = req.body.mac;
    const mac = hmacSHA256(dataStr, config.key2).toString();

    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
    } else {
      const dataJson = JSON.parse(dataStr);
      const [phone, orderCode] = dataJson.app_user.split("-");

      const orderDetail: any = await Order.findOne({
        phone: phone,
        code: orderCode,
        deleted: false
      });

      if(orderDetail) {
        orderDetail.paymentStatus = "paid";
        await deductStockAfterSuccessfulOrder(orderDetail);
        await addPointAfterPayment(orderDetail);
        await orderDetail.save();
      }

      result.return_code = 1;
      result.return_message = "success";
    }
  } catch (ex: any) {
    result.return_code = 0;
    result.return_message = ex.message;
  }

  res.json(result);
}

export const paymentVNPay = async (req: Request, res: Response) => {
  const { orderCode, phone } = req.query;

  const orderDetail = await Order.findOne({
    code: orderCode,
    phone: phone,
    deleted: false
  });

  if(!orderDetail) {
    res.redirect("/");
    return;
  }

  const date = new Date();
  const createDate = moment(date).format('YYYYMMDDHHmmss');

  const ipAddr = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;

  const apiPayment = await getApiPayment();
  const settingGeneral = await getGeneral();

  const tmnCode = `${apiPayment.vnPayTmnCode}`;
  const secretKey = `${apiPayment.vnPayHashSecret}`;
  let vnpUrl = `${apiPayment.vnPayURL}`;
  const returnUrl = `${settingGeneral.domainWebsite}/order/payment-vnpay-result`;
  const orderId = `${phone}-${orderCode}-${Date.now()}`;
  const amount = orderDetail.total || 0;
  const bankCode = "";

  const locale = 'vn';
  const currCode = 'VND';
  let vnp_Params: any = {};
  vnp_Params['vnp_Version'] = '2.1.0';
  vnp_Params['vnp_Command'] = 'pay';
  vnp_Params['vnp_TmnCode'] = tmnCode;
  vnp_Params['vnp_Locale'] = locale;
  vnp_Params['vnp_CurrCode'] = currCode;
  vnp_Params['vnp_TxnRef'] = orderId;
  vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
  vnp_Params['vnp_OrderType'] = 'other';
  vnp_Params['vnp_Amount'] = amount * 100;
  vnp_Params['vnp_ReturnUrl'] = returnUrl;
  vnp_Params['vnp_IpAddr'] = ipAddr;
  vnp_Params['vnp_CreateDate'] = createDate;
  if(bankCode !== null && bankCode !== ''){
    vnp_Params['vnp_BankCode'] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  const querystring = require('qs');
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
  vnp_Params['vnp_SecureHash'] = signed;
  vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

  res.redirect(vnpUrl);
}

export const paymentVNPayResult = async (req: Request, res: Response) => {
  let vnp_Params: any = req.query;

  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  const apiPayment = await getApiPayment();
  const secretKey = `${apiPayment.vnPayHashSecret}`;

  const querystring = require('qs');
  const signData = querystring.stringify(vnp_Params, { encode: false });
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

  if(secureHash === signed){
    const [ phone, orderCode ] = (vnp_Params['vnp_TxnRef'] as string).split('-');
    const orderDetail: any = await Order.findOne({
      phone: phone,
      code: orderCode,
      deleted: false
    });

    if(orderDetail) {
      orderDetail.paymentStatus = 'paid';
      await deductStockAfterSuccessfulOrder(orderDetail);
      await addPointAfterPayment(orderDetail);
      await orderDetail.save();
    }

    const settingGeneral = await getGeneral();

    res.redirect(`${settingGeneral.domainWebsite}/order/success?orderCode=${orderCode}&phone=${phone}`);
  } else{
    res.render('success', {code: '97'})
  }
}

export const exportPdf = async (req: Request, res: Response) => {
  const { orderCode, phone } = req.query;

  const orderDetail = await Order.findOne({
    code: orderCode,
    phone: phone,
    deleted: false
  });

  if(!orderDetail) {
    res.redirect("/");
    return;
  }

  const css = fs.readFileSync("public/client/assets/css/invoice.css", "utf8");
  const renderedHtml = await renderFile('views/client/pages/invoice.pug', {
    orderDetail: orderDetail
  });

  const html = `
    <style>${css}</style>
    ${renderedHtml}
  `;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderCode}.pdf`);
  res.send(pdfBuffer);
}

function sortObject(obj: any) {
  let sorted: any = {};
  let str: string[] = [];
  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (let i = 0; i < str.length; i++) {
    const decodedKey = decodeURIComponent(str[i]);
    sorted[str[i]] = encodeURIComponent(obj[decodedKey]).replace(/%20/g, "+");
  }
  return sorted;
}