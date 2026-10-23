# Dolphin Notes

个人博客，基于 [Hexo](https://hexo.io/) 构建，通过 GitHub Actions 自动部署到 GitHub Pages。

- 站点：<https://dolphin-ocean08.github.io/>
- 写文章：`hexo new "标题"`，编辑 `source/_posts/` 下的文件
- 发布：`git add -A && git commit -m "post: 标题" && git push`

仓库里存的是源码，构建产物由 `.github/workflows/pages.yml` 在每次 push 后自动生成并发布，不需要提交 `public/`。