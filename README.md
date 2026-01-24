# 实时协作在线画板 (Collaborative Drawing Board)

一个基于 Vue 3 + TypeScript + Socket.io 开发的实时协作在线画板。支持多人同时在线绘图、无限画布缩放与拖拽、矢量存储以及私有撤销/重做栈。

### ✨ 主要功能

- 🎨 **实时协作**：支持多人同时在一个画板上创作，实时同步笔触和鼠标位置。
- 🔍 **无限画布**：支持通过滚轮缩放和中键/Alt+左键拖拽，实现无限空间的创作体验。
- 🖋️ **矢量绘图**：采用矢量路径存储，保证缩放时不失真，并能准确重绘。
- 🛠️ **专业工具栏**：
  - **画笔/橡皮擦**：支持自定义颜色和粗细。
  - **撤销/重做**：每个用户拥有独立的撤销栈，互不干扰（仅撤销自己的笔触）。
  - **导出图片**：支持将画作导出为带背景的 PNG 图片。
  - **一键分享**：支持生成房间邀请链接，轻松邀请好友协作。
- 📱 **全屏模式**：提供更沉浸式的创作体验。
- 👤 **在线人数统计**：实时显示当前房间内的在线人数。

### 🚀 技术栈

- **前端**: Vue 3 (Composition API), TypeScript, Vite, Lucide Vue Next (图标库)
- **后端**: Node.js, Socket.io
- **通信**: WebSocket (实时双向通信)

### 📦 快速上手

#### 1. 克隆项目
```bash
git clone <your-repo-url>
cd collaborative-drawing-board
```

#### 2. 安装依赖
```bash
npm install
```

#### 3. 同时启动前端和后端
```bash
npm start
```

启动后：
- 前端访问地址：`http://localhost:5173`
- 后端服务地址：`http://localhost:3001`

> **注意**：如果是在不同设备间协作，请确保 `InfiniteCanvas.vue` 中的 `serverUrl` 指向正确的服务器 IP 地址。

### ⌨️ 快捷操作

- **绘图**：左键点击并拖拽。
- **缩放**：鼠标滚轮。
- **拖动画布**：按住鼠标中键 或 `Alt + 左键`。
- **调节粗细**：点击工具栏中的画笔/橡皮擦图标。

### 🛠️ 脚本命令

- `npm start`: 同时运行 Vite 开发服务器和 Socket.io 服务端（推荐）。
- `npm run dev`: 仅运行前端开发服务器。
- `npm run server`: 仅运行后端 Socket.io 服务端。
- `npm run build`: 执行 TypeScript 类型检查并构建生产环境包。

### 📝 开发说明

1. **协作逻辑**：每个路径都有唯一的 `pathId` 和 `userId`，通过 WebSocket 广播实时坐标点。
2. **撤销逻辑**：本地维护 `undoStack` 和 `redoStack`，撤销时只操作属于当前用户的路径 ID。
3. **坐标系统**：通过 `screenToCanvas` 和 `canvasToScreen` 函数实现屏幕坐标与带缩放/偏移的画布坐标之间的相互转换。

### 📜 许可证

MIT License
