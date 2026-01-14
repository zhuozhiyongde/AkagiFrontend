# Akagi Frontend

一个适配 [zhuozhiyongde/Akagi](https://github.com/zhuozhiyongde/Akagi) 的前端展示页面，替代原有的 TUI 模式，从而能够完成 AI 计算和前端展示的解耦，提高泛用性。

## ✨ 特性

-   **实时数据更新**：通过 SSE（Server-Sent Events）与 `Akagi` 的 `DataServer` 直接连接，确保推荐数据近乎零延迟。
-   **直播流模式 (Stream)**：将推荐渲染成视频流，并支持 **画中画 (Picture-in-Picture)** 功能，方便在游戏时悬浮查看。
-   **个性化主题**：支持亮色、暗色以及跟随系统设置的主题模式。
-   **后端地址可配置**：用户可以直接在前端页面上修改 `DataServer` 的地址，轻松连接到在任何地方运行的 `Akagi` 实例。

## 🚀 使用方式

该前端项目可以独立部署和运行，无需与 `Majsoul Helper` 的其他部分耦合。

### 1. 获取代码

```bash
git clone https://github.com/zhuozhiyongde/AkagiFrontend.git
cd AkagiFrontend
```

### 2. 安装依赖

```bash
bun install
```

### 3. 启动开发服务器

开发模式：

```bash
bun dev
```

生产模式：

```bash
bun run build
bun run preview
```

服务启动后，通常可以在 `http://localhost:5173` 访问。

### 4. 配置后端

1.  确保你的 `Akagi` 实例正在运行，并且 `DataServer` 已启动。
2.  在 `Akagi Frontend` 页面的输入框中，填入 `DataServer` 的地址（例如 `127.0.0.1:7881`）。
3.  连接成功后，即可实时查看 AI 推荐。

## 🔗 数据连接

-   前端通过 SSE (`http://<DataServer_IP>:<端口>`) 连接到 `Akagi` 项目中的 `DataServer`。
-   `DataServer` 的默认端口是 `7881`。
-   前端会实时接收 `DataServer` 推送的 JSON 格式的推荐数据，并进行渲染。

## 📜 许可证

GNU General Public License v3.0
