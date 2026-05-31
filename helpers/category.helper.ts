export function buildCategoryTree(categories: any, parentId: string = "") {
  // Bước 1: Lọc ra các danh mục có parent khớp với parentId hiện tại
  const currentLevelCategories = categories.filter(
    (category: any) => category.parent === parentId
  );

  // Bước 2: Duyệt qua từng danh mục và đệ quy để tìm các danh mục con
  const tree = currentLevelCategories.map((category: any) => {
    const children = buildCategoryTree(categories, category.id);

    return {
      id: category.id,
      name: category.name,
      avatar: category.avatar,
      slug: category.slug,
      status: category.status,
      children: children,
    };
  });

  // Bước 3: Trả về cây danh mục của cấp hiện tại
  return tree;
}