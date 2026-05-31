import { Request, Response } from 'express';
import { getGeneral } from '../../configs/setting.config';
import Product from '../../models/product.model';
import Blog from '../../models/blog.model';
import { pathAdmin } from '../../configs/variable.config';
import { formatProductItem, getBlogByCategory } from '../../helpers/product.helper';

export const home = async (req: Request, res: Response) => {
  const [saleProducts, newestProducts, latestArticles]: any = await Promise.all([
    Product.find({
      deleted: false,
      status: "active",
      priceOld: { $gt: 0 },
      priceNew: { $gt: 0 },
      $expr: { $gt: ["$priceOld", "$priceNew"] }
    })
      .sort({
        createdAt: "desc"
      })
      .limit(8),
    Product.find({
      deleted: false,
      status: "active"
    })
      .sort({
        createdAt: "desc"
      })
      .limit(8),
    getBlogByCategory({
      limit: 3,
      sort: {
        by: "createdAt",
        type: "desc"
      }
    })
  ]);

  for (const item of saleProducts) {
    formatProductItem(item);
  }

  for (const item of newestProducts) {
    formatProductItem(item);
  }

  res.render("client/pages/home", {
    pageTitle: "Trang chu",
    saleProducts: saleProducts,
    newestProducts: newestProducts,
    latestArticles: latestArticles
  });
}

export const sitemap = async (req: Request, res: Response) => {
  try {
    const settingGeneral = await getGeneral();
    const domain = settingGeneral.domainWebsite;

    let urls: string[] = [];

    /*
      url: Dai dien cho 1 trang muon Google index
      loc (location): La URL day du cua trang
      lastmod: Lan cap nhat gan nhat
      changefreq: Tan suat thay doi (always: lien tuc, hourly: gio, daily: ngay, weekly: tuan, monthly: thang, yearly: nam)
      priority: Muc do quan trong (muc do uu tien cua URL nay so voi cac URL khac trong site)
    */

    // Trang chu
    urls.push(`
      <url>
        <loc>${domain}/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
      </url>
    `);

    // San pham
    const productList = await Product.find({
      deleted: false,
      status: "active"
    }).select("slug updatedAt");

    productList.forEach(item => {
      urls.push(`
        <url>
          <loc>${domain}/product/detail/${item.slug}</loc>
          <lastmod>${item.updatedAt.toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>
      `);
    });

    // Bai viet
    const blogList = await Blog.find({
      deleted: false,
      status: "published"
    }).select("slug updatedAt");

    blogList.forEach(item => {
      urls.push(`
        <url>
          <loc>${domain}/article/detail/${item.slug}</loc>
          <lastmod>${item.updatedAt.toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>
      `);
    });

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        ${urls.join("")}
      </urlset>
    `;

    res.header("Content-Type", "application/xml");
    res.send(sitemapXml);

  } catch (error) {
    console.log(error);
    res.send("Loi khi tao sitemap cho trang web.");
  }
};

export const robots = async (req: Request, res: Response) => {
  const content = `
    User-agent: *
    Disallow: /${pathAdmin}/
  `;

  /*
    User-agent: * nghia la ap dung cho tat ca bot tim kiem
    Disallow: /admin/ nghia la khong cho bot crawl bat ky URL nao bat dau bang /admin/
  */

  res.type('text/plain');
  res.send(content);
}