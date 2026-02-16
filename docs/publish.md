# NPM 发布指南

## GitHub CI/CD 自动发布（推荐）

项目已配置 GitHub Actions 自动化 CI/CD，支持自动测试和发布。

### CI/CD 工作流

| Workflow | 触发条件 | 功能 |
|----------|----------|------|
| `ci.yml` | push/PR 到 master/main | 自动运行 lint、build、test |
| `publish.yml` | 发布 GitHub Release | 自动构建并发布到 npm |

### 首次设置（Trusted Publishing）

项目使用 [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)，**无需配置 NPM_TOKEN**，更安全。

#### 前提条件

- Node.js >= 22.14.0
- npm CLI >= 11.5.1

#### 在 npmjs.com 配置 Trusted Publisher

1. 登录 https://www.npmjs.com
2. 进入你的包页面 → **Settings** → **Trusted publishing**
3. 点击 **GitHub Actions**
4. 填写：
   - **Organization or user**: `letsgotoplay`
   - **Repository**: `skillhub-cli`
   - **Workflow filename**: `publish.yml`
   - **Environment name**: 留空
5. 点击 **Add**

配置后，GitHub Actions 会自动使用 OIDC 认证发布，无需任何 token。

### 发布新版本

```bash
# 1. 更新版本号
npm version patch  # 1.0.0 -> 1.0.1 (bug fixes)
npm version minor  # 1.0.0 -> 1.1.0 (new features)
npm version major  # 1.0.0 -> 2.0.0 (breaking changes)

# 2. 推送代码和 tag
git push && git push --tags

# 3. 在 GitHub 创建 Release
#    - 进入仓库 → Releases → Draft a new release
#    - 选择刚才创建的 tag
#    - 填写 Release title 和 notes
#    - 点击 Publish release
```

发布 Release 后，GitHub Actions 会自动：
1. 检出代码
2. 安装依赖
3. 构建项目
4. 发布到 npm

### 查看发布状态

- 进入仓库的 **Actions** 标签页
- 查看 workflow 运行状态和日志

---

## 手动发布（备选方案）

### 一次性设置（首次）

```bash
# 注册或登录 NPM
npm login

# 确认登录成功
npm whoami
```

### 发布步骤

```bash
# 确保构建最新
pnpm run build

# 发布到 NPM
npm publish
```

### 发布新版本

```bash
# 更新版本号
npm version patch  # 1.0.0 -> 1.0.1 (bug fixes)
npm version minor  # 1.0.0 -> 1.1.0 (new features)
npm version major  # 1.0.0 -> 2.0.0 (breaking changes)

# 发布
npm publish
```

## 企业内部发布

### 方案 1：Verdaccio（推荐，轻量级开源）

#### 服务端部署

```bash
# 安装 Verdaccio
npm install -g verdaccio

# 启动服务（默认 4873 端口）
verdaccio

# 后台运行（推荐用 pm2）
npm install -g pm2
pm2 start verdaccio
```

#### 发布包

```bash
# 1. 添加用户（首次）
npm adduser --registry http://npm.your-company.com:4873
# 输入用户名、密码、邮箱

# 2. 登录
npm login --registry http://npm.your-company.com:4873

# 3. 发布
npm publish --registry http://npm.your-company.com:4873

# 或者在 package.json 中配置 registry 后直接 npm publish
```

#### 用户安装

**方式 A：命令行指定 registry**
```bash
npm install -g @skillhub/cli --registry http://npm.your-company.com:4873
```

**方式 B：配置 .npmrc（推荐）**

创建 `~/.npmrc`：
```ini
# 企业私有包使用内部 registry
@skillhub:registry=http://npm.your-company.com:4873

# 其他包使用官方 registry（代理模式）
registry=https://registry.npmjs.org/

# 认证 token（adduser 后自动生成）
//npm.your-company.com:4873/:_authToken="xxxx-xxxx-xxxx"
```

配置后直接安装：
```bash
npm install -g @skillhub/cli
```

#### 更新包

```bash
# 发布者：更新版本并发布
npm version patch
npm publish --registry http://npm.your-company.com:4873

# 用户：更新安装
npm update -g @skillhub/cli
```

#### Verdaccio 代理模式优势

Verdaccio 会自动代理 npmjs.org：
- 私有包 → 从本地获取
- 公共包 → 从 npmjs.org 获取并缓存
- 离线可用（已缓存的包）

### 方案 2：GitHub Packages

```bash
# 登录 GitHub Packages
npm login --scope=@skillhub --registry=https://npm.pkg.github.com

# package.json 配置
# "publishConfig": {
#   "registry": "https://npm.pkg.github.com"
# }

# 发布
npm publish
```

### 方案 3：其他企业级方案

| 方案 | 特点 |
|------|------|
| **Artifactory** | JFrog 企业级，支持多种包管理器 |
| **Nexus** | Sonatype 仓库管理器 |
| **GitLab Package Registry** | GitLab 内置，CI/CD 集成好 |
| **AWS CodeArtifact** | AWS 云服务集成 |

## 用户安装方式

### 公开安装

```bash
# 全局安装
npm install -g @skillhub/cli

# 使用
skillhub login
skillhub search pdf
skillhub add pdf
```

### 企业内部安装

```bash
# 配置好 .npmrc 后，正常安装即可
npm install -g @skillhub/cli

# 或指定 registry
npm install -g @skillhub/cli --registry http://npm.your-company.com:4873
```

## 注意事项

- `@skillhub/cli` 是 scoped package，需要在 NPM 上有 `@skillhub` org 的权限
- 如果没有 org 权限，可以改用个人 scope：`@你的用户名/cli`
- `publishConfig.access: "public"` 已配置，scoped package 会公开发布
- 企业内部发布时，可以移除 `access: "public"` 或改为 `"restricted"`
