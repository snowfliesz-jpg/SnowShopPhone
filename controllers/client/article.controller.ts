import { Request, Response } from 'express';
import CategoryBlog from '../../models/category-blog.model';
import Blog from '../../models/blog.model';
import moment from 'moment';
import AccountAdmin from '../../models/account-admin.model';

export const articleByCategory = async (req: Request, res: Response) => {
  try {
    const categoryDetail = await CategoryBlog.findOne({
      slug: req.params.slug,
      deleted: false,
      status: "active"
    })

    if(!categoryDetail) {
      res.redirect("/");
      return;
    }

    const find: {
      category: string,
      status: string,
      deleted: boolean
    } = {
      category: categoryDetail.id,
      status: "published",
      deleted: false
    };

    // Phân trang
    const limitItems = 20;
    let page = 1;
    if(req.query.page) {
      const currentPage = parseInt(`${req.query.page}`);
      if(currentPage > 0) {
        page = currentPage;
      }
    }
    const totalRecord = await Blog.countDocuments(find);
    const totalPage = Math.ceil(totalRecord/limitItems);
    const skip = (page - 1) * limitItems;
    const pagination = {
      totalPage: totalPage,
      currentPage: page
    };
    // Hết Phân trang

    const articleList: any = await Blog
      .find(find)
      .limit(limitItems)
      .skip(skip)
      .sort({
        createdAt: "desc"
      });

    for (const item of articleList) {
      // if(item.createdAt) {
      //   item.createdAtFormat = moment(item.createdAt).format("DD/MM/YYYY");
      // }

      if(item.updatedBy) {
        const accountInfo = await AccountAdmin.findOne({
          _id: item.updatedBy
        })
        if(accountInfo) {
          item.authorName = accountInfo.fullName;
          item.date = moment(item.updatedAt).format("DD/MM/YYYY");
        }
      } else {
        const accountInfo = await AccountAdmin.findOne({
          _id: item.createdBy
        })
        if(accountInfo) {
          item.authorName = accountInfo.fullName;
          item.date = moment(item.createdAt).format("DD/MM/YYYY");
        }
      }
    }

    res.render("client/pages/article-by-category", {
      pageTitle: categoryDetail.name,
      categoryDetail: categoryDetail,
      articleList: articleList,
      pagination: pagination
    });
  } catch (error) {
    console.log(error);
  }
}

export const detail = async (req: Request, res: Response) => {
  const articleDetail: any = await Blog.findOne({
    slug: req.params.slug,
    deleted: false,
    status: "published"
  })

  if(!articleDetail) {
    res.redirect("/");
    return;
  }

  if(articleDetail.updatedBy) {
    const accountInfo = await AccountAdmin.findOne({
      _id: articleDetail.updatedBy
    })
    if(accountInfo) {
      articleDetail.authorName = accountInfo.fullName;
      articleDetail.date = moment(articleDetail.updatedAt).format("DD/MM/YYYY");
    }
  } else {
    const accountInfo = await AccountAdmin.findOne({
      _id: articleDetail.createdBy
    })
    if(accountInfo) {
      articleDetail.authorName = accountInfo.fullName;
      articleDetail.date = moment(articleDetail.createdAt).format("DD/MM/YYYY");
    }
  }

  // Tăng view
  const viewed = `viewed_${articleDetail.id}`;
  res.cookie(viewed, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
    sameSite: "strict",
    maxAge: 30 * 60 * 1000 // 30 phút
  })
  if(!req.cookies[viewed]) {
    await Blog.updateOne({
      slug: req.params.slug,
      deleted: false,
      status: "published"
    }, {
      $inc: { view: 1 } // mỗi lần gọi tăng 1
    })
  }

  res.render("client/pages/article-detail", {
    pageTitle: articleDetail.name,
    articleDetail: articleDetail,
  });
}