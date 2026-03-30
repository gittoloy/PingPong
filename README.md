# PingPong

PingPong 是一款基于 Electron 的桌面 API 测试工具，提供直观的界面来构建、发送和调试 HTTP 请求。

## 功能特性

- **请求构建器** - 支持多种 HTTP 方法（GET、POST、PUT、PATCH、DELETE、OPTIONS、HEAD）
- **请求体支持** - 支持 JSON、form-data、raw 等多种请求体格式
- **响应查看器** - 实时查看响应状态、响应头和响应体，支持语法高亮
- **历史记录** - 自动保存请求历史，支持快速加载历史请求
- **环境管理** - 管理多套环境配置，支持环境变量替换
- **API 管理** - 分组管理 API 接口，支持导入导出
- **测试运行器** - 批量执行测试用例，验证 API 响应

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Vue 3** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Pinia** - Vue 状态管理库
- **Element Plus** - Vue 3 UI 组件库
- **electron-vite** - Electron 构建工具
- **SQLite (sql.js)** - 本地数据持久化

## 项目结构

```
pingpong/
├── electron/
│   ├── main/           # 主进程代码
│   │   ├── database/   # 数据库模块
│   │   └── ipc/        # IPC 通信处理
│   └── preload/        # 预加载脚本
├── src/
│   ├── components/     # Vue 组件
│   │   ├── ApiManager/           # API 管理组件
│   │   ├── EnvironmentManager/   # 环境管理组件
│   │   ├── HistoryPanel/         # 历史记录面板
│   │   ├── RequestBuilder/       # 请求构建器
│   │   ├── ResponseViewer/       # 响应查看器
│   │   └── TestRunner/           # 测试运行器
│   ├── stores/         # Pinia 状态管理
│   ├── styles/         # 样式文件
│   └── types/          # TypeScript 类型定义
├── out/                # 构建输出目录
└── resources/          # 应用资源文件
```

## 开发环境

### 前置要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建应用

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

### 预览构建结果

```bash
npm run preview
```

## 使用说明

### 发送请求

1. 在请求构建器中选择 HTTP 方法
2. 输入请求 URL
3. 添加请求头和查询参数（可选）
4. 设置请求体（POST/PUT/PATCH 请求）
5. 点击发送按钮

### 管理环境

1. 点击右下角设置按钮打开环境管理器
2. 创建新环境并配置变量
3. 在顶部环境选择器中切换环境

### 管理 API

1. 在左侧边栏管理 API 分组和接口
2. 点击接口快速加载到请求构建器
3. 支持编辑和删除接口

### 运行测试

1. 点击右下角播放按钮打开测试运行器
2. 添加测试用例
3. 批量执行并查看结果

## 许可证

MIT
