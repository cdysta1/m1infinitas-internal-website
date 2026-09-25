# M1 Infinitas · 内部项目协作平台

面向 30-40 人艺术家团体的内部 Web 应用。以瀑布流画廊展示进行中的项目，成员可以像发朋友圈一样极简地创建项目和更新进度。

**技术栈**: React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Appwrite Cloud + GitHub Pages。

## 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 复制并填写环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 Appwrite Project/Database/Bucket ID 与邀请码

# 3. 启动开发服务器
npm run dev
```

## Appwrite 初始化

在 [Appwrite Console](https://cloud.appwrite.io) 完成以下配置。

### 1. Project

- 创建 Project，记下 `Project ID`
- 在 **Platforms** 添加 Web 平台，Host 填 GitHub Pages 域名（例如 `your-org.github.io`），本地开发再加 `localhost`

### 2. Database

创建一个 Database，记下 `Database ID`，然后创建以下 3 个 Collection：

#### `profiles`

| Attribute | Type | Size | Required | Default | 备注 |
|---|---|---|---|---|---|
| name | string | 64 | ✓ | | 昵称 |
| wechat | string | 64 | ✓ | | 微信号 |
| avatar_file_id | string | 64 | | | Storage 文件 ID |

- **Document Security**: 启用
- **Permissions** (collection 级): `users` → Read + Create；文档级由代码写入 `user:$id` update/delete
  - 注意：`create` 权限只能在 collection 级授予（文档创建时尚不存在），缺失会导致注册时建 profile 报 401。

#### `projects`

| Attribute | Type | Size | Required | Default | 备注 |
|---|---|---|---|---|---|
| title | string | 80 | ✓ | | 标题 |
| summary | string | 200 | ✓ | | 一句话简介 |
| cover_file_id | string | 64 | ✓ | | 封面 |
| owner_id | string | 36 | ✓ | | 负责人 user id |
| status | enum | `active`, `done` | ✓ | `active` | |
| updated_at | datetime | | ✓ | | 用于排序 |

- **Index**: `updated_at` DESC
- **Permissions**: `users` → Read + Create

#### `updates`

| Attribute | Type | Size | Required | Default | 备注 |
|---|---|---|---|---|---|
| project_id | string | 36 | ✓ | | 关联项目 |
| content | string | 1000 | ✓ | | 文字内容 |
| author_id | string | 36 | ✓ | | 作者 user id |
| file_ids | string[] | (数组，每项 ≤64) | ✓ | | 图片/视频 file id |
| created_at | datetime | | ✓ | | |

- **Index**: `project_id` ASC + `created_at` DESC（复合索引，加速 timeline 查询）
- **Permissions**: `users` → Read + Create

### 3. Storage Bucket

- 创建一个 Bucket，记下 `Bucket ID`
- **File Security**: 关闭（bucket 级权限统一管理，省去逐文件配置）
- **Permissions**（bucket 级）：`any` → Read；`users` → Create
  - 媒体必须是 **公开可读**：前端用裸 `<img>` 跨域加载图片，无法附带 Appwrite 会话 JWT 头。若限制为 `users` → Read，一旦浏览器不发送第三方 Cookie，图片请求就会 401 而静默失败。
  - 仅暴露读取；写入（Create）仍需登录用户。删除/更新未在 MVP 开放。
- **图片变换（transformations）**：当前 Appwrite 套餐 **不支持**（`preview` 端点返回 `403 storage_image_transformations_blocked`）。因此代码改用 `view` 端点返回原图，`?width=&quality=&output=webp` 变换参数已在 [media.ts](src/lib/media.ts) 中通过 `IMG_TRANSFORM_ENABLED` 开关关闭，升级套餐后可重新启用。
  - 前端已用 `browser-image-compression` 在上传前把图片压到 ~1MB，弥补无服务端变换的体积问题。

### 4. Auth

- 在 **Authentication → Settings** 中启用 `Email/Password`
- 关闭 Email 验证（内部使用，简化注册流程）；或按需开启

### 5. Realtime

Realtime 默认对所有已登录用户开放 `databases.*.collections.*.documents` 频道，无需额外配置。

## GitHub Actions 部署

1. 仓库 Settings → Pages → Source 选择 `GitHub Actions`
2. 在 Settings → Secrets and variables → Actions 添加以下 **Repository Secrets**：

| Name | Value |
|---|---|
| `VITE_APPWRITE_ENDPOINT` | `https://cloud.appwrite.io/v1`（自建实例填自己的域名） |
| `VITE_APPWRITE_PROJECT_ID` | Appwrite Project ID |
| `VITE_APPWRITE_DATABASE_ID` | Appwrite Database ID |
| `VITE_APPWRITE_BUCKET_ID` | Appwrite Bucket ID |
| `VITE_APPWRITE_COLLECTION_PROFILES` | `profiles`（若与控制台一致可省略） |
| `VITE_APPWRITE_COLLECTION_PROJECTS` | `projects` |
| `VITE_APPWRITE_COLLECTION_UPDATES` | `updates` |
| `VITE_INVITE_CODE` | 内部注册邀请码 |

3. 在 **Variables** 添加 `VITE_BASE_PATH`，例如 `/m1infinitas_internal/`（必须与仓库名一致，且以 `/` 开头和结尾）
4. 推送到 `main` 分支即触发部署

## 环境变量

见 [.env.example](./.env.example)。所有 `VITE_*` 变量在构建时注入，会包含在 bundle 中；`VITE_INVITE_CODE` 因此可见于前端，仅作为"内部软门槛"使用。如需真正的服务端校验，可迁移至 Appwrite Function（V2 计划）。

## 目录结构

```
src/
├─ app/          # Providers (Auth, Query, Toast)
├─ lib/          # env, appwrite client, media 压缩/URL, utils, constants
├─ types/        # 数据模型 TS 类型
├─ services/     # Appwrite SDK 薄封装 (auth, profiles, projects, updates, storage)
├─ hooks/        # react-query 封装 + 乐观 UI mutations
├─ components/
│  ├─ ui/        # shadcn 风格 primitives
│  ├─ layout/    # AppShell, Header, RequireAuth
│  ├─ gallery/   # MasonryGrid, ProjectCard
│  ├─ project/   # ProjectHeader, ContactBar, Timeline, UpdateFab
│  ├─ compose/   # CreateProjectDrawer, UpdateDialog, ImagePicker
│  └─ common/    # Lightbox, EmptyState, OptimisticBadge
├─ pages/        # Login, Register, Gallery, ProjectDetail, Me
├─ router.tsx    # Hash 路由表
├─ App.tsx       # Provider 组合
└─ main.tsx      # 入口 + env 校验
```

## 常用命令

```bash
npm run dev          # 本地开发 (http://localhost:5173)
npm run build        # 生产构建到 dist/
npm run preview      # 预览生产构建
npm run typecheck    # TS 类型检查
```

## MVP 边界（不做）

- 站内信 / 即时通讯（直接加微信）
- 复杂的标签、分类、搜索筛选
- 评论、点赞、收藏等社区互动
- 项目状态变更审批流
- SSR / 自建后端
