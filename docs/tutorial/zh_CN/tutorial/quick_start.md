# 快速开始

## 前置要求

- Node.js >= 20.0.0
- npm >= 10.0.0

> 💡 **提示**：如果你使用 nvm，可以运行 nvm use 自动切换到所需的 Node.js 版本。

如何检查 Node.js 版本：

```bash
node --version
npm --version
```

## 安装

### 从 NPM 安装

```bash
npm install -g @agentscope/studio

# 然后运行以下命令启动 AgentScope-Studio：
as_studio
```

### 从源码安装

```bash
git clone https://github.com/agentscope-ai/agentscope-studio
cd agentscope-studio
npm install

# 然后运行以下命令启动 AgentScope-Studio：
npm run dev
```

## 连接到 AgentScope-Studio

在 AgentScope 项目中，在 `init` 函数中设置 `studio_url` 字段，如下所示：

```python
import agentscope

agentscope.init(
    ...
    # 替换为你启动 AgentScope-Studio 的端口
    studio_url="http://localhost:3000",
)
```

## 配置

要配置 AgentScope-Studio 设置，可以在启动 AgentScope-Studio 的位置创建一个 `.env` 文件。
以下是一些常用的配置选项：

> 💡 **提示**：我们正在添加更多配置选项。敬请期待！

```env
PORT=3000
OTEL_GRPC_PORT=4317
```
