<a id="readme-top"></a>

# Lucuro - 鹿客司南

Stay lucky, stay curious. 指引数字世界的琉璃司南。

极简开箱的纯前端浏览器起始页。搭载毛玻璃古典美学、自定义每日语录与随身手记，无缝跨屏同步，为你指引数字世界的探索之旅。

**GitHub：** [https://github.com/Helloxiaolaodi/Lucuro](https://github.com/Helloxiaolaodi/Lucuro)

语言：**简体中文** | [English](./README.md) | [问题反馈](https://github.com/Helloxiaolaodi/Lucuro/issues)

详细搭建指南：见仓库 `docs/` 下的部署笔记与浏览器商店发布清单。

技术栈：Vue 3 | Vite | Vue I18n | lucide-vue-next | SortableJS | webextension-polyfill | Cloudflare Workers | rollup-plugin-visualizer

![License](https://img.shields.io/github/license/Helloxiaolaodi/Lucuro?style=flat-square)
![Stars](https://img.shields.io/github/stars/Helloxiaolaodi/Lucuro?style=flat-square)
![Forks](https://img.shields.io/github/forks/Helloxiaolaodi/Lucuro?style=flat-square)
![Issues](https://img.shields.io/github/issues/Helloxiaolaodi/Lucuro?style=flat-square)
![Vue](https://img.shields.io/badge/Vue-3.5.13-42B883?style=flat-square&logo=vue.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.0.5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Manifest](https://img.shields.io/badge/Manifest-V3-black?style=flat-square)

## 目录

1. [项目概览](#项目概览)
2. [Lucuro 当前包含的能力](#lucuro-当前包含的能力)
3. [架构与同步模型](#架构与同步模型)
4. [快速开始](#快速开始)
5. [数据与同步工作流](#数据与同步工作流)
6. [书签导入与弹窗工作流](#书签导入与弹窗工作流)
7. [维护说明](#维护说明)
8. [技术栈与参考资料](#技术栈与参考资料)
9. [安全注意事项](#安全注意事项)
10. [致谢](#致谢)
11. [许可证](#许可证)


- 默认主题为浅色毛玻璃渐变，深色模式采用玄黑与夜空蓝的深色质感。
- 每日语录已升级为“一言”功能，用户可以在设置面板自定义。
- 随身手记支持 Markdown 输入，并使用防抖自动保存。
- 本地快照历史最多保留 8 个恢复点。
- 可选 Chrome 书签导入只读取浏览器书签树，不会上传数据。
- 工具栏弹窗支持添加当前页面和切换新标签页接管。
- 原生同步使用 `chrome.storage.sync`，并带有 `chrome.storage.local` 回退。
- 取件码分享使用临时 Cloudflare Worker，6 位数字、10 分钟过期。
- 海外支持使用 Ko-fi，国内支持使用插件自带的微信收款码。
- 每次构建都会通过 `rollup-plugin-visualizer` 生成 `stats.html`，便于检查体积。

## 项目概览

Lucuro 是一个基于 Vue 3 的 Manifest V3 浏览器扩展，用来接管浏览器新标签页，并提供轻量的个人导航工作台与工具栏弹窗。

- **新标签页工作台**：侧边栏分类、搜索框、推荐卡片、年度/当日进度、可拖拽网址网格、自定义一言和随身手记。
- **工具栏弹窗**：把当前页面添加到选中分类，切换新标签页接管，并打开设置。
- **设置面板**：主题、毛玻璃透度、一言、搜索引擎、布局锁定、同步、书签导入与支持入口。
- **本地数据**：网址、设置、点击统计与快照历史保存在浏览器扩展存储中。
- **同步**：个人多设备使用浏览器原生同步，跨账号或跨浏览器使用临时取件码分享。
- **隐私**：核心功能不需要账号、分析或遥测；只有用户主动触发取件码分享时才会产生出站请求。

武侠风毛玻璃只是默认皮肤，不是产品约束。用户可以通过设置自定义语录、网址、主题与布局，无需修改代码。

### 预览媒体

商店截图与扩展源码分开维护。默认背景和个人头像都可以由用户在设置中自定义，因此 Lucuro 不依赖仓库中的媒体文件即可运行。

## Lucuro 当前包含的能力

### 访客与使用者可完成的操作

#### 检索与发现

- 在中央搜索框搜索书签或直接输入搜索指令。
- 在设置面板切换搜索引擎。
- 根据本地点击频率生成推荐卡片。
- 支持 `Ctrl/Cmd+K`、`Ctrl/Cmd+Shift+L`、`Ctrl/Cmd+Shift+N` 和 `Ctrl/Cmd+Shift+Q` 等快捷键。

#### 视觉布局

- 使用侧边栏组织网址分类。
- 使用 SortableJS 拖拽卡片排序。
- 开启布局锁定，避免日常点击时误改布局。
- 按默认、使用频率、字母顺序或添加时间排序。
- 在本地编辑器中新增、编辑和删除分类与卡片。
- 调节毛玻璃模糊度，并在浅色和深色模式之间切换。

#### 一言与手记

- 在设置面板输入自定义每日语录，也就是“一言”。
- 一键刷新当前展示的语录。
- 使用 Markdown 编写随身手记。
- 手记停止输入后会经过短暂防抖自动保存。

#### 进度与专注

- 在主页查看年度与当日进度条。
- 保持界面轻量，让新标签页几乎瞬间打开。
- 所有个人数据保存在本地，不依赖远程账号。

#### 同步与备份

- 个人多设备同步使用浏览器原生 `chrome.storage.sync`。
- 创建本地快照历史，最多保留 8 个恢复点。
- 使用 6 位取件码把完整配置分享给其他账号或浏览器。
- 自动同步延迟时，可在设置面板手动强制上传或拉取。

#### 弹窗与浏览器集成

- 从工具栏弹窗把当前页面添加到 Lucuro。
- 切换 Lucuro 是否接管新标签页。
- 关闭接管后，扩展会跳转到空白新标签页。
- 授权 `bookmarks` 可选权限后，可以导入 Chrome 书签树。

### 对 fork 使用者的价值

- 核心是纯前端、本地优先，可打包为 Chrome、Edge 与 Firefox 扩展。
- 权限面刻意保持最小：`storage`、`unlimitedStorage`、`activeTab` 和可选的 `bookmarks`。
- 唯一外部域名是可选取件码分享所使用的 Worker 域名。
- 数据结构和设置足够通用，可以扩展新的主题、语录来源与导航布局。

## 架构与同步模型

Lucuro 将三层职责分开：

- 浏览器扩展存储中的本地数据
- 浏览器原生同步，也就是 `chrome.storage.sync`
- 可选的 Cloudflare Worker + KV 临时分享

推荐的生产布局：

1. 使用 `npm run build` 构建扩展
2. 本地测试时加载解包后的 `dist/` 目录
3. 把 `dist/` 打包提交到 Chrome Web Store、Microsoft Edge Add-ons 或 Firefox AMO
4. 仅在需要跨账号分享时部署取件码 Worker

### 当前同步策略

- 原生同步由浏览器管理，需要多台设备登录同一浏览器账号。
- 写入操作会防抖，避免频繁消耗同步配额。
- 同步不可用时，扩展会回退到本地存储。
- 取件码分享使用 `POST /api/share` 与 `GET /api/share/:code`。
- 取件码为 6 位数字，10 分钟过期。
- 默认 Worker 地址为 `https://lucuro-share.helloxiaolaodi.workers.dev`。
- 图标使用 Favicon CDN URL，配置中不保存图片载荷，因此体积适合原生同步。

## 快速开始

### 1. 安装

```bash
git clone https://github.com/Helloxiaolaodi/Lucuro.git
cd Lucuro
npm install
```

### 2. 本地运行

```bash
npm run dev
```

测试扩展时，打开 `chrome://extensions/`，开启开发者模式，再加载构建后的扩展目录。

### 3. 生产构建

```bash
npm run build
```

构建会生成 `dist/index.html`、`dist/popup.html`、`dist/blank.html`、`dist/manifest.json`、`dist/assets/` 与 `dist/icons/`。同时会生成 `stats.html`，显示 gzip 与 brotli 体积，用于体积分析。

### 4. 打包提交商店

```bash
npm run build
```

只打包 `dist/` 内的文件，并让 `manifest.json` 位于 ZIP 根目录。提交前验证：

- `manifest_version` 为 `3`
- `chrome_url_overrides.newtab` 指向 `index.html`
- `action.default_popup` 指向 `popup.html`
- `icons` 包含 16、32、48、128 像素 PNG
- `permissions` 只包含 `storage`、`unlimitedStorage` 与 `activeTab`
- `optional_permissions` 只包含 `bookmarks`
- `host_permissions` 只限制到 Worker 域名

### 5. 发布

1. 把 ZIP 上传到 Chrome Web Store，并填写商店信息、隐私政策、截图与图标。
2. 把同一份 ZIP 上传到 Microsoft Edge Add-ons。
3. 使用 Firefox 时，确认 `browser_specific_settings` 的 gecko ID 后，再提交到 Firefox Add-ons。
4. 如果商店拒绝包，先检查 `stats.html`、manifest 合法性、图标尺寸与权限声明，再重新提交。

## 数据与同步工作流

### 数据保存在哪里

扩展使用以下存储键：

- `lucuro_links_v1`：网址树、分类、卡片、图标与排序
- `lucuro_settings_v1`：主题、一言、搜索引擎、布局锁定与偏好
- `lucuro_stats_v1`：推荐卡片使用的点击频率
- `lucuro_history_v1`：有界本地快照历史，最多 8 条

数据是纯 JSON，不包含图片载荷。

### 原生同步

原生同步是个人多设备的默认流程：

1. 用户在多台设备登录同一浏览器账号。
2. Lucuro 把防抖后的配置变更写入 `chrome.storage.sync`。
3. 浏览器在后台完成同步。
4. 同步不可用时，Lucuro 回退到本地存储。

自动同步延迟时，用户可以在设置中手动强制上传或拉取。

### 取件码分享

取件码分享用于跨账号或跨浏览器传输：

1. 发送端把配置快照 POST 到 Worker。
2. Worker 把载荷存入随机 6 位取件码，并设置 10 分钟 TTL。
3. 接收端输入取件码。
4. 接收端读取载荷并在本地应用。

Worker 只保存临时载荷，不保存用户账号或长期历史。

### 快照历史

- 快照保存在本地并且有界。
- 恢复时只覆盖选中数据范围。
- 需要保留设置时，恢复逻辑会保留设置。
- 快照恢复被当作正式用户流程测试，而不是可选工具。

## 书签导入与弹窗工作流

### 书签导入

书签导入是可选项：

1. 用户在设置中授权 `bookmarks` 可选权限。
2. Lucuro 调用 `chrome.bookmarks.getTree()`。
3. 浏览器书签树被转换为 Lucuro 分类与卡片。
4. 用户确认后再保存。

该过程中书签数据不会离开浏览器。

### 弹窗

工具栏弹窗提供：

- 添加当前页面
- 选择目标分类
- 切换新标签页接管
- 打开设置

弹窗与新标签页共用同一套存储键。

## 维护说明

### 仓库结构

- `index.html`：新标签页 HTML 入口
- `popup.html`：工具栏弹窗 HTML 入口
- `src/`：Vue 组件、store、工具、样式与语言包
- `public/`：manifest、静态资源、图标、blank 页、个人资料图与微信收款码
- `worker/`：可选取件码 Worker 模板
- `docs/`：部署与维护说明

### 当前功能所需保留的最小文件集

建议至少保留：

- `src/`
- `index.html`
- `popup.html`
- `public/manifest.json`
- `public/icons/`
- `public/blank.html`
- `public/qrcode-wechat.png`
- `vite.config.js`
- `package.json`

未被部署使用的默认 Favicon 资源可以自行删除。

### 构建与体积分析

运行：

```bash
npm run build
```

再检查 `stats.html` 中的 gzip 与 brotli 体积。如果某个依赖或组件体积异常，发布前应重构或懒加载。

### 验证

推送前建议执行：

```bash
npm run build
```

然后在真实浏览器扩展存储中验证新标签页、弹窗、设置、存储、同步、书签导入、快照恢复与取件码分享。

## 技术栈与参考资料

Lucuro 基于一组开源工具构建，用于界面渲染、本地存储、浏览器扩展 API 与体积分析。

| 工具 | 版本 | 功能 | 参考 |
| --- | --- | --- | --- |
| [Vue](https://vuejs.org/guide/introduction.html) | `^3.5.13` | 前端框架 | 官方指南 |
| [Vite](https://vite.dev/guide/) | `^6.0.5` | 构建工具 | 官方指南 |
| [Vue I18n](https://vue-i18n.intlify.dev/) | `^9.14.2` | 中英文界面文案 | 官方文档 |
| [lucide-vue-next](https://lucide.dev/guide/packages/lucide-vue-next) | `^0.468.0` | 图标库 | 官方文档 |
| [SortableJS](https://github.com/SortableJS/Sortable) | `^1.15.6` | 可拖拽卡片网格 | GitHub 仓库 |
| [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) | `^0.12.0` | 跨浏览器扩展 API 兼容 | GitHub 仓库 |
| [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) | `^5.12.0` | 构建体积可视化 | GitHub 仓库 |
| [sharp](https://sharp.pixelplumbing.com/) | `^0.35.3` | 图标处理工作流 | 官方文档 |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/) | 最新版 | 可选取件码分享端点 | 官方文档 |

附加社区链接：

- [LINUX DO](https://linux.do/) - 新一代 Linux 社区

## 安全注意事项

### 本地优先隐私

- 核心导航不需要账号、分析或遥测。
- 用户笔记、Token 与私有配置保存在浏览器扩展存储中。
- 除非用户主动触发取件码分享，否则不会上传任何数据。

### 最小权限

- 只使用 `storage`、`unlimitedStorage`、`activeTab` 与可选的 `bookmarks`。
- 不添加 `<all_urls>` 或无关权限。
- 保持 manifest 声明诚实，便于商店审核并建立用户信任。

### Worker 边界

- `host_permissions` 只限制到 Worker 域名。
- Worker 接受有界载荷并强制执行 TTL。
- Worker 不保存用户账号或长期历史。

### CSP

- 只允许本地脚本。
- 禁止远程代码执行。
- `connect-src` 只允许 Lucuro 使用的 Worker 域名。

### 商店审核就绪

- 发布隐私政策。
- 说明原生同步、可选取件码分享与可选书签导入。
- 避免隐藏权限。
- 包中不包含密钥与开发路径。

### 支持入口

- 海外支持：Ko-fi，地址为 [https://ko-fi.com/helloxiaolaodi](https://ko-fi.com/helloxiaolaodi)
- 国内支持：微信收款码，资源路径为 `public/qrcode-wechat.png`
- 不需要第三方支付 SDK

## 致谢

### 仓库搭建者

这个 Lucuro GitHub 仓库由 **Helloxiaolaodi** 维护。

### 参与本仓库搭建的 AI 工具

在本仓库的方案设计、实现、文档编写与迭代过程中，也共同使用了以下 AI 工具：

- **GLM 5.1**
- **GPT 5.4**
- **DeepSeek V4 Pro**

### README 媒体素材署名

- 默认背景与头像资源归档在扩展源码之外。
- 用户可以在设置中自定义头像，无需修改仓库文件。

## 许可证

本项目基于 [MIT 许可证](LICENSE) 授权。

[返回顶部](#readme-top)

## 最近更新

- 首发 Manifest V3 版本，包含新标签页接管与工具栏弹窗。
- 新增默认浅色渐变主题与玄黑/夜空蓝深色模式。
- 新增自定义每日语录“一言”功能。
- 新增随身手记，支持 Markdown 与防抖自动保存。
- 新增可拖拽卡片网格、布局锁定与多种排序模式。
- 新增年度/当日进度条与推荐卡片。
- 新增本地快照历史，最多保留 8 个恢复点。
- 新增可选 Chrome 书签导入。
- 新增弹窗添加当前页面与新标签页开关。
- 新增 `chrome.storage.sync` 原生同步与本地回退。
- 新增 6 位取件码分享，通过 Cloudflare Worker 实现。
- 新增 `rollup-plugin-visualizer`，用于 gzip 与 brotli 体积分析。
- 海外支持设置为 Ko-fi，国内支持保留微信收款码。
