/* ===========================================================================
   动态壁纸注入（FGO Ring Of Light · Wallpaper Engine scene 2522870818）
   ---------------------------------------------------------------------------
   在每张 HTML 页面里注入：
     <head>  预加载底图 + wallpaper.css
     </body> 壁纸层 #wp-bg、音乐按钮 + audio、wallpaper.js
   用 after_render:html 而不是主题的 inject 配置，好处是换主题也不用改这里。
   =========================================================================== */
"use strict";

hexo.extend.filter.register(
  "after_render:html",
  function (html) {
    if (!/<head[\s>]/i.test(html) || !/<\/body>/i.test(html)) return html;

    var root = hexo.config.root || "/";
    if (root.charAt(root.length - 1) !== "/") root += "/";
    var images = root + "images/wallpaper/";

    var head = [
      /* 给 <html> 挂 wp-js：关掉 JS 时静态壁纸直接可见，不需要等脚本 */
      "<script>document.documentElement.classList.add('wp-js')</script>",
      '<link rel="preload" as="image" href="' +
        images +
        'ring-2560.webp" imagesrcset="' +
        images +
        "ring-1280.webp 1280w, " +
        images +
        'ring-2560.webp 2560w" imagesizes="100vw" fetchpriority="high">',
      '<link rel="stylesheet" href="' + root + 'css/wallpaper.css">'
    ].join("\n");

    var layer = [
      '<div id="wp-bg" aria-hidden="true">',
      '  <div class="wp-stage">',
      '    <img class="wp-img" src="' +
        images +
        'ring-1280.webp" srcset="' +
        images +
        "ring-1280.webp 1280w, " +
        images +
        'ring-2560.webp 2560w" sizes="100vw" alt="" decoding="async" fetchpriority="high">',
      '    <canvas class="wp-canvas" width="1" height="1"></canvas>',
      "  </div>",
      '  <div class="wp-veil"></div>',
      '  <div class="wp-fade"></div>',
      "</div>"
    ].join("\n");

    var player = [
      '<div class="wp-sound">',
      '  <button type="button" class="wp-sound-btn" id="wp-sound-btn" aria-pressed="false" aria-label="播放壁纸音乐" title="播放壁纸音乐（色彩 〜雪花の盾〜）">',
      '    <svg class="wp-sound-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">',
      '      <path class="wp-wave" d="M4 9v6h3.4l4.1 3.4V5.6L7.4 9H4z"/>',
      '      <path class="wp-wave" d="M14.6 8.6a4.6 4.6 0 0 1 0 6.8l1.2 1.2a6.3 6.3 0 0 0 0-9.2z"/>',
      '      <path class="wp-wave" d="M17.2 5.6a8.4 8.4 0 0 1 0 12.8l1.2 1.2a10.1 10.1 0 0 0 0-15.2z"/>',
      '      <path class="wp-slash" d="M3.5 4.2 19.8 20.5"/>',
      "    </svg>",
      '    <span class="wp-sound-label">音乐</span>',
      "  </button>",
      "</div>",
      '<audio id="wp-audio" src="' + root + 'audio/ring-of-light.flac" loop preload="none"></audio>'
    ].join("\n");

    var script = '<script src="' + root + 'js/wallpaper.js" defer></script>';

    return html
      .replace(/<\/head>/i, head + "\n</head>")
      .replace(/<\/body>/i, layer + "\n" + player + "\n" + script + "\n</body>");
  },
  5
);
