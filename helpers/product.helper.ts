import moment from "moment";
import AccountAdmin from "../models/account-admin.model";
import Blog from "../models/blog.model";
import CategoryBlog from "../models/category-blog.model";
import CategoryProduct from "../models/category-product.model";
import Product from "../models/product.model";

export const formatProductItem = (item: any) => {
  const priceOld = Number(item.priceOld) || 0;
  const priceNew = Number(item.priceNew) || 0;
  item.discount = priceOld > priceNew && priceOld > 0
    ? Math.floor(((priceOld - priceNew) / priceOld) * 100)
    : 0;

  const colorSet = new Set();
  const variants = Array.isArray(item.variants) ? item.variants : [];

  variants
    .filter((variant: any) => variant.status)
    .forEach((variant: any) => {
      const attributeValue = Array.isArray(variant.attributeValue) ? variant.attributeValue : [];
      attributeValue.forEach((attr: any) => {
        if(attr.attrType == "color") {
          colorSet.add(attr.value);
        }
      });
    });

  item.colorList = [...colorSet];
}

export const getProductByCategory = async (getByCategory: any) => {
  let productList: any[] = [];

  const find: any = {
    deleted: false,
    status: "active"
  };

  if(getByCategory.category && getByCategory.category.length) {
    const categoryList = await CategoryProduct.find({
      slug: { $in: getByCategory.category },
      deleted: false,
      status: "active"
    });
    const categoryIds = categoryList.map((category: any) => category.id);
    find.category = { $in: categoryIds };
  }

  let limit = 10;
  if(getByCategory.limit) {
    limit = getByCategory.limit;
  }

  const sort: any = {};
  if(getByCategory.sort && getByCategory.sort.by && getByCategory.sort.type) {
    sort[getByCategory.sort.by] = getByCategory.sort.type;
  }

  productList = await Product
    .find(find)
    .sort(sort)
    .limit(limit);

  for(const item of productList) {
    formatProductItem(item);
  }

  return productList;
}

export const getBlogByCategory = async (getByCategory: any) => {
  let blogList: any[] = [];

  const find: any = {
    deleted: false,
    status: "published"
  };

  if(getByCategory.category && getByCategory.category.length) {
    const categoryList = await CategoryBlog.find({
      slug: { $in: getByCategory.category },
      deleted: false,
      status: "active"
    });
    const categoryIds = categoryList.map((category: any) => category.id);
    find.category = { $in: categoryIds };
  }

  let limit = 10;
  if(getByCategory.limit) {
    limit = getByCategory.limit;
  }

  const sort: any = {};
  if(getByCategory.sort && getByCategory.sort.by && getByCategory.sort.type) {
    sort[getByCategory.sort.by] = getByCategory.sort.type;
  }

  blogList = await Blog
    .find(find)
    .sort(sort)
    .limit(limit);

  for(const item of blogList) {
    if(item.updatedBy) {
      const accountInfo = await AccountAdmin.findOne({
        _id: item.updatedBy
      });
      if(accountInfo) {
        item.authorName = accountInfo.fullName;
        item.date = moment(item.updatedAt).format("DD/MM/YYYY");
      }
    } else {
      const accountInfo = await AccountAdmin.findOne({
        _id: item.createdBy
      });
      if(accountInfo) {
        item.authorName = accountInfo.fullName;
        item.date = moment(item.createdAt).format("DD/MM/YYYY");
      }
    }
  }

  return blogList;
}