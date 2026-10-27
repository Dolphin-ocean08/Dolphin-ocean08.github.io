# Dolphin Notes

个人博客，基于 [Hexo](https://hexo.io/) 构建，通过 GitHub Actions 自动部署到 GitHub Pages。

- 站点：<https://dolphin-ocean08.github.io/>
- 写文章：`hexo new "标题"`，编辑 `source/_posts/` 下的文件
- 发布：`git add -A && git commit -m "post: 标题" && git push`

仓库里存的是源码，构建产物由 `.github/workflows/pages.yml` 在每次 push 后自动生成并发布，不需要提交 `public/`。

## 动态壁纸：FGO Ring Of Light

全站背景接的是 Wallpaper Engine 创意工坊作品 [2522870818](https://steamcommunity.com/sharedfiles/filedetails/?id=2522870818)（FGO Ring Of Light，scene 类型）。

网页跑不了 `scene.pkg`，所以是把工程解包后**按原参数在浏览器里重放**：

| 文件 | 作用 |
| --- | --- |
| `scripts/wallpaper.js` | 构建时把壁纸层、样式、脚本注入每一张页面（换主题也不用改这里） |
| `source/css/wallpaper.css` | 壁纸层样式 + Butterfly 主题「透出」适配（含深色模式、移动端） |
| `source/js/wallpaper.js` | WebGL 运行时：底图 + waterflow 水波 + light shafts 光束 + 音乐开关 |
| `source/images/wallpaper/` | 底图 WebP、flow mask、phase 噪声、光束贴图 |
| `source/audio/ring-of-light.flac` | 原曲循环（`preload="none"`，默认不播，点左下角按钮才开始下载） |

还原自原工程的参数：正交相机 3840×2160；waterflow `speed 0.1 / strength 1.0 / phasescale 2.0`；
5 个 light shafts 发射器的坐标、角度、缩放、速率、尺寸、颜色、寿命与角速度。

降级顺序：WebGL 画布 → 静态 WebP → 主题纯色。关掉 JS、`prefers-reduced-motion`、
`save-data`、WebGL 不可用时都只显示静态图；页面切到后台会暂停渲染。

- **临时关掉**：删掉或改名 `scripts/wallpaper.js`，重新生成后页面就不再注入壁纸层。
- **换壁纸**：替换 `source/images/wallpaper/` 里的图；调参数改 `source/js/wallpaper.js` 顶部常量。
