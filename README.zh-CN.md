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

- 新标签页工作台：树状侧边栏分类、搜索、拖拽卡片、自定义一言、今日手记 Markdown 工具栏、撤销/清空与自动隐藏侧边栏
- 工具栏弹窗：切换新标签页启动方式，可选 Lucuro 主页或浏览器默认主页
- 通过内置 `bookmarks` 权限自动导入浏览器原生书签树
- 数据来源互斥切换：浏览器书签或用户上传的本地 JSON 文件
- 背景图片支持模糊与选区裁剪，默认头像使用 Lucuro 标识
- 使用 `chrome.storage.sync` 原生同步并保留本地回退
- 海外赞助使用 Ko-fi，国内赞助使用微信收款码
- 本地优先，无需账号，无遥测，无外部同步服务
