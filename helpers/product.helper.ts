import moment from "moment";
import AccountAdmin from "../models/account-admin.model";
import Blog from "../models/blog.model";
import CategoryBlog from "../models/category-blog.model";
import CategoryProduct from "../models/category-product.model";
import Product from "../models/product.model";

const colorAliasMap: Record<string, string> = {
  nightblue: "#191970",
  midnightblue: "#191970",
  xanhbongdem: "#191970",
  xanhocean: "#1d4ed8",
  xanhduong: "#2563eb",
  xanhla: "#16a34a",
  do: "#dc2626",
  den: "#111827",
  trang: "#f8fafc",
  vang: "#f59e0b",
  tim: "#7c3aed",
  hong: "#ec4899",
  bac: "#9ca3af",
  gray: "#9ca3af",
  grey: "#9ca3af"
};

const normalizeColorKey = (value: string = "") => {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export const getColorStyleValue = (value: string = "", label: string = "") => {
  const rawValue = `${value}`.trim();
  const rawLabel = `${label}`.trim();

  if(!rawValue && !rawLabel) {
    return "#d1d5db";
  }

  if(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(rawValue)) {
    return rawValue;
  }

  if(/^(rgb|rgba|hsl|hsla)\(/i.test(rawValue)) {
    return rawValue;
  }

  if(/^var\(--.+\)$/i.test(rawValue)) {
    return rawValue;
  }

  const normalizedValue = normalizeColorKey(rawValue);
  const normalizedLabel = normalizeColorKey(rawLabel);

  if(colorAliasMap[normalizedValue]) {
    return colorAliasMap[normalizedValue];
  }

  if(colorAliasMap[normalizedLabel]) {
    return colorAliasMap[normalizedLabel];
  }

  if(/^[a-z-]+$/i.test(rawValue) && !rawValue.includes(" ")) {
    return rawValue.toLowerCase();
  }

  return "#d1d5db";
}

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
          colorSet.add(getColorStyleValue(attr.value, attr.label));
        }
      });
    });

  item.colorList = [...colorSet];
}

export const normalizeVariantSelection = (attributeValue: any[] = [], attributeList: any[] = []) => {
  const attributeMap = new Map(
    attributeList.map((attribute: any) => [`${attribute._id || attribute.id}`, attribute])
  );

  return attributeValue.map((attr: any) => {
    const attributeId = `${attr.attrId || ""}`;
    const attributeInfo: any = attributeMap.get(attributeId);

    if(!attributeInfo || !Array.isArray(attributeInfo.options)) {
      return {
        ...attr,
        attrId: attributeId
      };
    }

    const currentLabel = `${attr.label || ""}`.trim().toLowerCase();
    const currentValue = `${attr.value || ""}`.trim().toLowerCase();

    const matchedOption = attributeInfo.options.find((option: any) => `${option.value}` === `${attr.value}`)
      || attributeInfo.options.find((option: any) => `${option.label}`.trim().toLowerCase() === currentLabel)
      || attributeInfo.options.find((option: any) => `${option.value}`.trim().toLowerCase() === currentValue);

    if(!matchedOption) {
      return {
        ...attr,
        attrId: attributeId,
        attrType: attr.attrType || attributeInfo.type
      };
    }

    return {
      ...attr,
      attrId: attributeId,
      attrType: attributeInfo.type || attr.attrType,
      label: matchedOption.label,
      value: matchedOption.value
    };
  });
}

export const normalizeProductVariants = (variants: any[] = [], attributeList: any[] = []) => {
  return variants.map((variant: any) => {
    const variantObject = typeof variant?.toObject === "function" ? variant.toObject() : { ...variant };

    return {
      ...variantObject,
      attributeValue: normalizeVariantSelection(variantObject.attributeValue || [], attributeList)
    };
  });
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
