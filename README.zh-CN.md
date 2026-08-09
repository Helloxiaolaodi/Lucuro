# Lucuro - 鹿客司南

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

- 新标签页工作台：侧边栏分类、搜索、拖拽卡片、自定义一言、随身手记与自动隐藏侧边栏
- 工具栏弹窗：捕获当前页面、切换新标签页接管
- 通过可选 `bookmarks` 权限一键捕获浏览器原生书签树
- 使用 `chrome.storage.sync` 原生同步并保留本地回退
- 支持本地背景与头像上传
- 海外赞助使用 Ko-fi，国内赞助使用微信收款码
- 本地优先，无需账号，无遥测，无外部同步服务
