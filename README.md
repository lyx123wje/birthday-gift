# 易烊千玺风格个人网站 · 使用指南

基于 [xiqianyangyi.com](https://www.xiqianyangyi.com) 的设计风格复刻，一个极简的数字日记式个人网站。

---

## 文件结构

```
yyqx/
├── index.html      ← 首页（起点）
├── subIndex.html   ← 导航枢纽
├── feed.html       ← 动态流（核心）
├── stream.html     ← 流芳（情绪投递）
├── audio.html      ← 锵锵（音频空间）
└── README.md       ← 本文件
```

## 访问入口

在浏览器打开 `index.html`：

```
双击 yyqx/index.html    （Windows）
或 拖拽到浏览器窗口
```

或者用本地服务器启动（推荐，避免跨域限制）：

```bash
cd yyqx
python -m http.server 8080
# 然后访问 http://localhost:8080
```

## 页面导航

```
┌──────────────┐
│  index.html  │  首页 · 视频背景 + 红色"憙"印章
│   (首页)     │
└──────┬───────┘
       │ 点击印章
       ▼
┌──────────────┐
│ subIndex.html│  导航枢纽 · 三个入口
│  (导航页)    │
└──┬───┬───┬──┘
   │   │   │
   ▼   ▼   ▼
 发自  流  锵
 天然  芳  锵
   │
   ▼
┌──────────────┐
│  feed.html   │  动态流 · 图片卡片 + 时间戳
│  (核心页)    │
└──────────────┘
```

**返回路径：**
- `feed.html` → 点击顶部"发自天然" → 回到 `index.html`
- `stream.html` / `audio.html` → 点击左上角"← 返回" → 回到 `subIndex.html`

## 如何替换内容

### 替换首页视频

`index.html` 第 112 行附近：

```html
<video class="video-bg" autoplay muted loop playsinline>
  <source src="你的视频.mp4" type="video/mp4">
</video>
```

将 `你的视频.mp4` 替换为你的视频文件名。

### 修改 Feed 内容

打开 `feed.html`，找到 `<main class="feed">`，每条内容结构如下：

```html
<div class="feed-item">
  <!-- 图片 -->
  <img class="feed-image" src="你的图片.jpg" alt=""
       loading="lazy"
       onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
  <!-- 图片加载失败的占位符 -->
  <div style="display:none;aspect-ratio:1/1;background:#1a1a1a;border-radius:1px;"></div>

  <!-- 日期时间戳（精确到秒） -->
  <div class="feed-date">2026.4.28 &nbsp; 02:15:33</div>

  <!-- 可选文字描述 -->
  <div class="feed-caption">你想说的话</div>
</div>
```

复制一段 `.feed-item` 并修改：
- `src` → 你的图片路径
- `aspect-ratio` → 1/1（方形）、3/4（竖图）、4/3（横图）
- `background` → 图片加载失败时的底色
- 日期和描述文字 → 随你编辑

### 修改顶部标题

`feed.html` 中搜索 `发自天然`，替换为你想要的文字（共 4 个字符效果最佳）。

`subIndex.html` 中的导航文字同理。

### 修改印章文字

`index.html` 和 `subIndex.html` 中搜索 `<text` 标签，修改其中 `憙` 字符即可。

## 设计特点

| 特性 | 说明 |
|------|------|
| 移动端优先 | 内容宽度 460px，桌面端两侧为黑色边框 |
| 毛玻璃头部 | `backdrop-filter: blur` 半透明模糊，滚动时图片可透出 |
| 极简排版 | 卡片间无分割线，纯靠留白区分 |
| 微小时间戳 | 10.5px 暖灰色衬线体，精确到秒 |
| 淡入动画 | IntersectionObserver 驱动，滚动时平滑出现 |
| 无外部依赖 | 除 Google Fonts 外纯原生 HTML/CSS/JS |

## 浏览器兼容

- Chrome / Edge 80+
- Safari 13+（需 `-webkit-backdrop-filter`）
- Firefox 70+
- 移动端 iOS Safari / Android Chrome 均适配

`backdrop-filter` 在不支持的浏览器上会退化为不透明背景，不影响可用性。

## 自定义字体

页面使用 Google Fonts 的 `Noto Serif SC`（思源宋体）。如需离线使用，可下载字体放到本地并修改 `@import` 为本地路径。
