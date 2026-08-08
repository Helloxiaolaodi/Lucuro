# Vue-Helloxiaolaodi

**Lucuro - 鹿客司南** 的私有源码仓库，一个基于 Vue 3、Vite、Manifest V3 与 webextension-polyfill 的轻量本地优先浏览器新标签页扩展。

公开产品仓库：[https://github.com/Helloxiaolaodi/Lucuro](https://github.com/Helloxiaolaodi/Lucuro)

## 快速开始

```bash
npm install
npm run dev
npm run build
```

生产构建输出到 `dist/`，每次构建后由 `rollup-plugin-visualizer` 生成 `stats.html`。

## 功能

- 新标签页工作台：侧边栏分类、搜索、推荐、拖拽卡片、自定义一言与随身手记
- 工具栏弹窗：捕获当前页面、切换新标签页接管
- 一键捕获浏览器原生书签树
- 使用 `chrome.storage.sync` 原生同步并保留本地回退
- 通过轻量 Cloudflare Worker 提供可选 6 位取件码分享
- 海外赞助使用 Ko-fi，国内赞助使用微信收款码
- 本地优先，无需账号，无遥测
