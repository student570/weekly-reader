# Weekly Knowledge Reader

基于阮一峰[《科技爱好者周刊》](https://github.com/ruanyf/weekly)打造的个人知识阅读工作台。采用 **纯无状态构建 + SHA 轮询 + 本地 IndexedDB 持久化** 架构，将 400+ 期周刊转化为可检索、可批注、可收藏、支持专注阅读的现代化 Web 知识库。

- **在线演示**：https://weekly-reader.pages.dev/
- **上游内容源**：[ruanyf/weekly](https://github.com/ruanyf/weekly)

---

## 核心特性

### 1. 三栏可调布局与响应式设计
- **桌面端三栏工作台**：左侧导航栏（年份 / 期数 / 收藏夹 / 稍后研究 / 阅读历史）、中间内容索引（文章列表 / 分类筛选 / 全文搜索结果）、右侧阅读器（Markdown 正文 / 目录 / 个人笔记）。
- **自由调整与状态记忆**：支持拖拽调整三栏宽度、一键折叠侧栏，布局状态与主题偏好自动保存至 `localStorage`。
- **移动端单栏模式**：`≤900px` 自动切换为顶部标签切换 + 抽屉导航，不强行压缩三栏。

### 2. 内容索引与自动分类
- **三层内容架构**：年份（`2026`、`2025`、`2024`、`历史归档`）→ 期数 → 文章分类。
- **7 大统一分类**：`科技动态`、`开源项目`、`编程技术`、`AI`、`产品设计`、`资源推荐`、`其他`。支持系统自动提取，也支持在阅读时手动修正分类（持久化至本地）。
- **每期阅读概览（Overview）**：自动统计本期文章数、已读/收藏数、外部链接数、分类分布柱状图以及涉及的 GitHub 项目列表。

### 3. 全文检索（Full-text Search）
- 支持对**标题、正文关键词、GitHub 项目名称**进行全文检索。
- 支持**分类、年份、期数**多条件组合筛选，并在结果中展示所属期数、分类与关键词上下文片段。

### 4. 个人知识管理（IndexedDB 本地持久化）
所有个人数据均保存在浏览器本地 **IndexedDB**，与原始周刊内容完全隔离，上游更新绝不覆盖个人数据：
- **收藏系统**：支持自定义收藏夹（默认预置 `AI Agent`、`MCP`、`感兴趣的项目`）、添加标签与个人备注、按收藏时间排序。
- **阅读进度与 Continue Reading**：自动记录阅读位置（滚动百分比）、已读/未读状态与最近阅读历史；首页工作台提供 `CONTINUE READING` 一键恢复上次阅读位置。
- **划词批注与个人笔记**：支持选中正文添加多色批注、撰写文章摘要与个人观点、补充相关外部链接、标记「稍后研究」。
- **数据备份**：支持一键导出全部个人数据为 `.json` 文件。

### 5. 沉浸式阅读体验
- 原生 Markdown 渲染、代码语法高亮与一键复制、图片自适应、外部链接新窗口打开。
- 自动生成文章目录（TOC）、顶部阅读进度条。
- 支持字号（`SM / MD / LG / XL`）、行宽（窄 / 适中 / 宽）、**Light / Dark** 主题切换。
- **Focus Mode（专注阅读模式）**：隐藏左右侧栏，只保留正文。
- **键盘快捷键**：`⌘K` / `/` 搜索，`J` / `K` 下一篇/上一篇，`M` 标记已读，`F` 切换专注模式，`Esc` 退出专注模式。

---

## 技术架构（0 MB 无状态构建）

本仓库**不存储任何周刊 Markdown 原文或生成的 JSON 索引**，彻底避免仓库膨胀与上游文件冲突：

```text
GitHub Actions (每 6 小时轮询上游 Commit SHA)
   │
   ├─ SHA 未变化 ──▶ 跳过构建（零算力浪费）
   │
   └─ SHA 发生变化 ──▶ POST Cloudflare Pages Deploy Hook
                          │
                          ▼
               Cloudflare Pages 构建环境
               1. scripts/prepare-data.mjs 浅克隆上游仓库
               2. scripts/parse-weekly.mjs 解析 Markdown → public/data/
               3. tsc && vite build 打包静态资源 → dist/
```

---

## 本地开发

### 环境要求
- Node.js 20+
- npm

### 启动步骤

```bash
# 1. 克隆本仓库
git clone https://github.com/student570/weekly-reader.git
cd weekly-reader

# 2. 安装依赖
npm install

# 3. 准备周刊数据（会自动浅克隆上游仓库并解析为 JSON 索引）
#    如果本地已有 ../student570/weekly，或设置了 WEEKLY_REPO_PATH 环境变量，会直接复用本地目录
node scripts/prepare-data.mjs

# 4. 启动开发服务器
npm run dev
```

### 生产构建

```bash
npm run build
```

---

## 部署指南（Cloudflare Pages + 自动同步）

### 1. 部署到 Cloudflare Pages
1. Fork 或推送本仓库到你的 GitHub。
2. 在 Cloudflare Pages 创建新项目，关联该仓库：
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
3. （可选）在 Cloudflare Pages 环境变量中设置 `WEEKLY_UPSTREAM_REPO=ruanyf/weekly`（默认追踪 `student570/weekly`）。
4. 在 Cloudflare Pages 项目 **Settings → Builds & deployments → Deploy hooks** 中创建一个 Deploy Hook，复制生成的 URL。

### 2. 配置 GitHub Actions 自动更新
在 GitHub 仓库 **Settings → Secrets and variables → Actions** 中配置：
- **Secrets** 添加：`CF_DEPLOY_HOOK_URL` = 你的 Cloudflare Deploy Hook URL。
- **Variables**（可选）添加：`WEEKLY_UPSTREAM_REPO` = `ruanyf/weekly`。

配置完成后，GitHub Actions 会每 6 小时检查一次上游最新 Commit SHA，一旦有新一期发布，自动触发 Cloudflare Pages 重新构建上线。

### 3. （可选）私有访问控制
如需限制仅自己可访问部署后的站点，可在 Cloudflare 控制台开启 **Zero Trust → Access**，为你的 `*.pages.dev` 域名添加邮箱或 GitHub 登录策略（50 人以内免费）。

---

## 项目结构

```text
weekly-reader/
├── .github/workflows/
│   └── sync-weekly.yml      # 上游 SHA 轮询 + Cloudflare Deploy Hook 触发器
├── scripts/
│   ├── prepare-data.mjs     # 无状态构建数据准备脚本（自动拉取上游并清理）
│   └── parse-weekly.mjs     # Markdown 解析器（生成 issues.json 与按年分片）
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx      # 左侧栏：年份/期数树、收藏夹、历史、主题与备份
│   │   ├── ContentIndex.tsx # 中间栏：文章列表、分类筛选、全文检索
│   │   ├── Dashboard.tsx    # 首页阅读工作台与 Continue Reading
│   │   ├── IssueOverview.tsx# 每期阅读概览与 GitHub 项目汇总
│   │   └── ArticleReader.tsx# 右侧阅读器、TOC、划词批注与个人笔记
│   ├── db/
│   │   └── indexedDb.ts     # IndexedDB 本地持久化封装
│   ├── utils/
│   │   ├── dataLoader.ts    # 索引与分片懒加载、全文检索辅助
│   │   └── markdown.ts      # Markdown 渲染、代码高亮与 TOC 提取
│   ├── styles/
│   │   └── index.css        # 完整设计系统（Light/Dark 主题与响应式布局）
│   ├── types.ts             # TypeScript 类型定义
│   └── App.tsx              # 主应用与三栏状态协调
├── index.html
├── package.json
└── vite.config.ts
```

---

## License

MIT
