/* ==========================================================================
   FGO Ring Of Light · 动态壁纸运行时
   --------------------------------------------------------------------------
   原作是 Wallpaper Engine 2522870818（scene 类型）。网页跑不了 scene.pkg，
   但工程里真正参与渲染的东西只有四样，全部解包出来按原参数重放：

     1. 底图       3840×2160（scene objects[0] 的 genericimage2 材质）
     2. 水波扭曲   effects/waterflow：flow mask(RG88) + phase 噪声，片元着色器
                   逐行照抄原 shader，参数也用 scene.json 里的
                   speed=0.1 / strength=1.0 / phasescale=2.0
     3. 光束       scene 里 5 个 "Light shafts 0" 粒子发射器，位置 / 角度 /
                   缩放 / 速率 / 尺寸 / 颜色 / 寿命 / 角速度都取自
                   particles/presets/light_shafts_0.json
     4. BGM        循环播放，默认不响，点左下角按钮才播

   性能与降级：DPR 封顶、离屏暂停、减少动态 / 省流 / 无 WebGL 时只用静态图。
   ========================================================================== */
(function () {
  "use strict";

  var layer = document.getElementById("wp-bg");
  if (!layer) return;

  var canvas = layer.querySelector(".wp-canvas");
  var img = layer.querySelector(".wp-img");

  var motionQuery =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var conn = navigator.connection || navigator.mozConnection || {};
  var saveData = conn.saveData === true;

  /* ---------------------------------------------------------------- 静态图 */
  function revealImage() {
    if (img) img.classList.add("is-ready");
  }

  if (img) {
    if (img.complete && img.naturalWidth) revealImage();
    else img.addEventListener("load", revealImage, { once: true });
    img.addEventListener("error", function () {
      img.style.display = "none";
    });
  }

  /* ------------------------------------------------------------------ 音乐 */
  (function audio() {
    var el = document.getElementById("wp-audio");
    var btn = document.getElementById("wp-sound-btn");
    if (!el || !btn) return;

    var VOLUME = 0.5;
    var timer = 0;

    function ramp(node, to, done) {
      window.clearInterval(timer);
      timer = window.setInterval(function () {
        var v = node.volume + (to - node.volume) * 0.18;
        if (Math.abs(v - to) < 0.03) {
          node.volume = to;
          window.clearInterval(timer);
          if (done) done();
        } else {
          node.volume = Math.max(0, Math.min(1, v));
        }
      }, 40);
    }

    function setPlaying(on) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", on ? "暂停壁纸音乐" : "播放壁纸音乐");
      btn.setAttribute("title", on ? "暂停壁纸音乐" : "播放壁纸音乐");
    }

    btn.addEventListener("click", function () {
      if (el.paused) {
        el.volume = 0;
        var played = el.play();
        if (played && played.then) {
          played
            .then(function () {
              setPlaying(true);
              ramp(el, VOLUME);
            })
            .catch(function () {
              setPlaying(false);
            });
        } else {
          setPlaying(true);
          ramp(el, VOLUME);
        }
      } else {
        ramp(el, 0, function () {
          el.pause();
          setPlaying(false);
        });
      }
    });
  })();

  /* ---------------------------------------------------------------- WebGL */
  var canWebGL = !!(canvas && (window.WebGLRenderingContext || window.WebGL2RenderingContext));
  if (!canWebGL || saveData) return;
  if (motionQuery && motionQuery.matches) return;

  var gl = null;
  try {
    var opts = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "low-power"
    };
    gl =
      canvas.getContext("webgl2", opts) ||
      canvas.getContext("webgl", opts) ||
      canvas.getContext("experimental-webgl", opts);
  } catch (err) {
    gl = null;
  }
  if (!gl) return;

  var isGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;

  var IMAGES = {
    art: "images/wallpaper/ring-2560.webp",
    flow: "images/wallpaper/flow.png",
    phase: "images/wallpaper/phase.png",
    shaft: "images/wallpaper/shaft.webp"
  };

  /* 站点可能部署在子路径下，从当前 <script>/<link> 反推根路径 */
  var base = (function () {
    var links = document.querySelectorAll('link[rel="stylesheet"]');
    for (var i = links.length - 1; i >= 0; i--) {
      var href = links[i].getAttribute("href") || "";
      if (/css\/wallpaper\.css$/.test(href)) return href.replace(/css\/wallpaper\.css$/, "");
    }
    var scripts = document.querySelectorAll("script[src]");
    for (var j = scripts.length - 1; j >= 0; j--) {
      var src = scripts[j].getAttribute("src") || "";
      if (/js\/wallpaper\.js$/.test(src)) return src.replace(/js\/wallpaper\.js$/, "");
    }
    return "/";
  })();

  /* ------------------------------------------------------------- 场景常量 */
  var SCENE_W = 3840;
  var SCENE_H = 2160;
  var FLOW_SPEED = 0.1;
  var FLOW_STRENGTH = 1.0;
  var PHASE_SCALE = 2.0;

  /* scene.json 里的 5 个粒子发射器（image 坐标，y 向下） */
  var EMITTERS = [
    { x: 2880.00024, y: 242.79071, angle: 0.44722, scale: 1.0, rate: 0.4, max: 20, sizeMul: 0.58, speedMul: 1.48 },
    { x: 876.27911, y: 1938.75366, angle: -2.43775, scale: 1.50608, rate: 0.2, max: 16, sizeMul: 1.0, speedMul: 1.0 },
    { x: 3045.04199, y: 1836.66968, angle: 2.08564, scale: 1.28919, rate: 0.2, max: 16, sizeMul: 1.0, speedMul: 1.0 },
    { x: 734.34406, y: 312.94897, angle: -1.02339, scale: 0.78311, rate: 0.2, max: 16, sizeMul: 1.0, speedMul: 1.0 },
    { x: 1331.55322, y: 2043.18176, angle: -2.66129, scale: 1.0, rate: 0.2, max: 16, sizeMul: 1.0, speedMul: 1.0 }
  ];

  var particles = [];

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function spawn(em, warm) {
    var life = rand(8, 20);
    var baseVel = 20 * em.scale * em.speedMul;
    var vy = 10 * em.scale * em.speedMul;
    var ca = Math.cos(em.angle);
    var sa = Math.sin(em.angle);
    var p = {
      x: em.x,
      y: em.y,
      vx: baseVel * ca - vy * sa,
      vy: baseVel * sa + vy * ca,
      life: life,
      t: warm ? rand(0, life) : 0,
      size: rand(850, 1000) * em.scale * em.sizeMul,
      angle: em.angle,
      spin: -0.05,
      r: rand(110, 170) / 255,
      g: rand(92, 110) / 255,
      b: rand(20, 40) / 255
    };
    /* 预热的粒子要沿速度方向补上「已经飞了 t 秒」的位移 */
    if (p.t) {
      p.x += p.vx * p.t;
      p.y += p.vy * p.t;
      p.angle += p.spin * p.t;
    }
    return p;
  }

  function seed() {
    particles.length = 0;
    for (var i = 0; i < EMITTERS.length; i += 1) {
      var em = EMITTERS[i];
      var count = Math.max(1, Math.round(em.rate * 14));
      for (var k = 0; k < count; k += 1) {
        var seeded = spawn(em, true);
        seeded.owner = em;
        particles.push(seeded);
      }
    }
  }

  function update(dt) {
    var i, p;
    for (i = particles.length - 1; i >= 0; i -= 1) {
      p = particles[i];
      p.t += dt;
      if (p.t >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
    }

    for (i = 0; i < EMITTERS.length; i += 1) {
      var em = EMITTERS[i];
      em.wait = (em.wait === undefined ? 0 : em.wait) - dt;
      if (em.wait <= 0) {
        var alive = 0;
        for (var j = 0; j < particles.length; j += 1) {
          if (particles[j].owner === em) alive += 1;
        }
        if (alive < em.max) {
          var fresh = spawn(em, false);
          fresh.owner = em;
          particles.push(fresh);
        }
        em.wait = rand(0.6, 1.6) / em.rate;
      }
    }
  }

  /* --------------------------------------------------------------- shaders */
  var VS_BG = [
    "attribute vec2 aPos;",
    "uniform vec2 uUvScale;",
    "uniform vec2 uUvOffset;",
    "varying vec2 vUv;",
    "void main() {",
    "  vUv = aPos * uUvScale + uUvOffset;",
    "  gl_Position = vec4(aPos.x * 2.0 - 1.0, 1.0 - aPos.y * 2.0, 0.0, 1.0);",
    "}"
  ].join("\n");

  /* 逐行对应工程里的 shaders/effects/waterflow.frag */
  var FS_BG = [
    "precision highp float;",
    "varying vec2 vUv;",
    "uniform sampler2D uArt;",
    "uniform sampler2D uFlow;",
    "uniform sampler2D uPhase;",
    "uniform float uTime;",
    "uniform float uSpeed;",
    "uniform float uStrength;",
    "uniform float uPhaseScale;",
    "void main() {",
    "  vec2 uv = vUv;",
    "  float flowPhase = texture2D(uPhase, uv * uPhaseScale).r;",
    "  vec2 flowColors = texture2D(uFlow, uv).rg;",
    "  vec2 flowMask = (flowColors - vec2(0.498)) * 2.0;",
    "  float flowAmount = min(length(flowMask), 1.0);",
    "  vec4 cycles = vec4(",
    "    fract(uTime * uSpeed),",
    "    fract(uTime * uSpeed + 0.5),",
    "    fract(0.25 + uTime * uSpeed),",
    "    fract(0.25 + uTime * uSpeed + 0.5)",
    "  );",
    "  float blend = 2.0 * abs(cycles.x - 0.5);",
    "  float blend2 = 2.0 * abs(cycles.z - 0.5);",
    "  cycles -= vec4(0.5);",
    "  vec4 offA = vec4(flowMask.xyxy * uStrength * 0.1) * cycles.xxyy;",
    "  vec4 offB = vec4(flowMask.xyxy * uStrength * 0.1) * cycles.zzww;",
    "  vec4 albedo = texture2D(uArt, uv);",
    "  vec4 flowA = mix(texture2D(uArt, uv + offA.xy), texture2D(uArt, uv + offA.zw), blend);",
    "  vec4 flowB = mix(texture2D(uArt, uv + offB.xy), texture2D(uArt, uv + offB.zw), blend2);",
    "  vec4 flowAlbedo = mix(flowA, flowB, smoothstep(0.2, 0.8, flowPhase));",
    "  gl_FragColor = mix(albedo, flowAlbedo, flowAmount);",
    "}"
  ].join("\n");

  var VS_SPRITE = [
    "attribute vec2 aCorner;",
    "uniform vec2 uCenter;",
    "uniform vec2 uHalf;",
    "uniform float uAngle;",
    "uniform vec2 uUvScale;",
    "uniform vec2 uUvOffset;",
    "varying vec2 vUv;",
    "void main() {",
    "  float c = cos(uAngle);",
    "  float s = sin(uAngle);",
    "  vec2 p = vec2(aCorner.x * c - aCorner.y * s, aCorner.x * s + aCorner.y * c) * uHalf;",
    "  vec2 uv = uCenter + p;",
    "  vec2 v = (uv - uUvOffset) / uUvScale;",
    "  gl_Position = vec4(v.x * 2.0 - 1.0, 1.0 - v.y * 2.0, 0.0, 1.0);",
    "  vUv = aCorner * 0.5 + 0.5;",
    "}"
  ].join("\n");

  var FS_SPRITE = [
    "precision mediump float;",
    "varying vec2 vUv;",
    "uniform sampler2D uSprite;",
    "uniform vec3 uColor;",
    "uniform float uAlpha;",
    "void main() {",
    "  vec3 texel = texture2D(uSprite, vUv).rgb;",
    "  gl_FragColor = vec4(texel * uColor * uAlpha, 1.0);",
    "}"
  ].join("\n");

  function compile(type, source) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      if (window.console) window.console.warn(gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function link(vsSource, fsSource) {
    var vs = compile(gl.VERTEX_SHADER, vsSource);
    var fs = compile(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      if (window.console) window.console.warn(gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  var progBg = link(VS_BG, FS_BG);
  var progSprite = link(VS_SPRITE, FS_SPRITE);
  if (!progBg || !progSprite) return;

  var bgU = {
    uUvScale: gl.getUniformLocation(progBg, "uUvScale"),
    uUvOffset: gl.getUniformLocation(progBg, "uUvOffset"),
    uTime: gl.getUniformLocation(progBg, "uTime"),
    uSpeed: gl.getUniformLocation(progBg, "uSpeed"),
    uStrength: gl.getUniformLocation(progBg, "uStrength"),
    uPhaseScale: gl.getUniformLocation(progBg, "uPhaseScale"),
    uArt: gl.getUniformLocation(progBg, "uArt"),
    uFlow: gl.getUniformLocation(progBg, "uFlow"),
    uPhase: gl.getUniformLocation(progBg, "uPhase")
  };
  var bgA = gl.getAttribLocation(progBg, "aPos");

  var spU = {
    uCenter: gl.getUniformLocation(progSprite, "uCenter"),
    uHalf: gl.getUniformLocation(progSprite, "uHalf"),
    uAngle: gl.getUniformLocation(progSprite, "uAngle"),
    uUvScale: gl.getUniformLocation(progSprite, "uUvScale"),
    uUvOffset: gl.getUniformLocation(progSprite, "uUvOffset"),
    uColor: gl.getUniformLocation(progSprite, "uColor"),
    uAlpha: gl.getUniformLocation(progSprite, "uAlpha"),
    uSprite: gl.getUniformLocation(progSprite, "uSprite")
  };
  var spA = gl.getAttribLocation(progSprite, "aCorner");

  var quadBg = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBg);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);

  var quadSprite = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadSprite);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  /* -------------------------------------------------------------- textures */
  function makeTexture(src, mip) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    var entry = { tex: tex, ready: false };
    var image = new Image();
    image.decoding = "async";
    image.onload = function () {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (mip && isGL2) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      entry.ready = true;
    };
    image.onerror = function () {
      entry.failed = true;
    };
    image.src = base + src;
    return entry;
  }

  var texArt = makeTexture(IMAGES.art, true);
  var texFlow = makeTexture(IMAGES.flow, false);
  var texPhase = makeTexture(IMAGES.phase, false);
  var texShaft = makeTexture(IMAGES.shaft, false);

  /* ------------------------------------------------------------ cover 映射 */
  var view = { w: 1, h: 1 };
  var uvScale = [1, 1];
  var uvOffset = [0, 0];

  function computeCover() {
    var aspect = view.w / view.h;
    var artAspect = 16 / 9;
    /* 竖屏时裁切更靠上一点，和 CSS 里 object-position 的 38% 对齐 */
    var focalY = view.w <= 768 ? 0.38 : 0.42;
    var sx = 1;
    var sy = 1;
    if (aspect > artAspect) sy = artAspect / aspect;
    else sx = aspect / artAspect;
    uvScale[0] = sx;
    uvScale[1] = sy;
    uvOffset[0] = (1 - sx) * 0.5;
    uvOffset[1] = (1 - sy) * focalY;
  }

  function resize() {
    var rect = layer.getBoundingClientRect();
    var cssW = Math.max(1, Math.round(rect.width || window.innerWidth));
    var cssH = Math.max(1, Math.round(rect.height || window.innerHeight));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    /* 片元着色器每像素采样 6 次，封一个 2560 宽的上限，够清晰也不会拖机器 */
    var maxW = 2560;
    if (cssW * dpr > maxW) dpr = maxW / cssW;
    var w = Math.max(1, Math.round(cssW * dpr));
    var h = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    view.w = cssW;
    view.h = cssH;
    computeCover();
  }

  /* ------------------------------------------------------------------ loop */
  var raf = 0;
  var running = false;
  var last = 0;
  var time = 0;

  function draw(now) {
    if (!running) return;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;

    time += dt;
    update(dt);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.BLEND);

    if (texArt.ready) {
      gl.clearColor(0.46, 0.53, 0.7, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(progBg);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBg);
      gl.enableVertexAttribArray(bgA);
      gl.vertexAttribPointer(bgA, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texArt.tex);
      gl.uniform1i(bgU.uArt, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, texFlow.tex);
      gl.uniform1i(bgU.uFlow, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, texPhase.tex);
      gl.uniform1i(bgU.uPhase, 2);

      gl.uniform2f(bgU.uUvScale, uvScale[0], uvScale[1]);
      gl.uniform2f(bgU.uUvOffset, uvOffset[0], uvOffset[1]);
      gl.uniform1f(bgU.uTime, time);
      gl.uniform1f(bgU.uSpeed, FLOW_SPEED);
      gl.uniform1f(bgU.uStrength, FLOW_STRENGTH);
      gl.uniform1f(bgU.uPhaseScale, PHASE_SCALE);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(bgA);

      if (!canvas.classList.contains("is-ready") && time > 0.1) {
        canvas.classList.add("is-ready");
      }
    }

    if (texShaft.ready && particles.length) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(progSprite);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadSprite);
      gl.enableVertexAttribArray(spA);
      gl.vertexAttribPointer(spA, 2, gl.FLOAT, false, 0, 0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texShaft.tex);
      gl.uniform1i(spU.uSprite, 0);
      gl.uniform2f(spU.uUvScale, uvScale[0], uvScale[1]);
      gl.uniform2f(spU.uUvOffset, uvOffset[0], uvOffset[1]);

      for (var i = 0; i < particles.length; i += 1) {
        var p = particles[i];
        var fadeIn = Math.min(1, p.t / 0.8);
        var fadeOut = Math.min(1, (p.life - p.t) / 2.2);
        var alpha = fadeIn * fadeOut;
        if (alpha <= 0.002) continue;

        gl.uniform2f(spU.uCenter, p.x / SCENE_W, p.y / SCENE_H);
        gl.uniform2f(spU.uHalf, (p.size * 0.5) / 2 / SCENE_W, p.size / 2 / SCENE_H);
        gl.uniform1f(spU.uAngle, p.angle);
        gl.uniform3f(spU.uColor, p.r, p.g, p.b);
        gl.uniform1f(spU.uAlpha, alpha * 0.9);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      gl.disableVertexAttribArray(spA);
      gl.disable(gl.BLEND);
    }

    raf = window.requestAnimationFrame(draw);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    raf = window.requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ------------------------------------------------------------------ boot */
  seed();
  resize();

  var resizeTimer = 0;
  window.addEventListener(
    "resize",
    function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        resize();
        if (!document.hidden) start();
      }, 160);
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });

  canvas.addEventListener(
    "webglcontextlost",
    function (event) {
      event.preventDefault();
      stop();
      canvas.classList.remove("is-ready");
    },
    false
  );

  canvas.addEventListener(
    "webglcontextrestored",
    function () {
      canvas.classList.add("is-ready");
      start();
    },
    false
  );

  if (motionQuery && motionQuery.addEventListener) {
    motionQuery.addEventListener("change", function (event) {
      if (event.matches) {
        stop();
        canvas.classList.remove("is-ready");
      } else {
        canvas.classList.add("is-ready");
        start();
      }
    });
  }

  start();
})();
