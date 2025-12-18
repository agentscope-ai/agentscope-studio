# QuickStart

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

> 💡 **Tip**: If you're using nvm, you can run nvm use to automatically switch to the required Node.js version.

How to check your Node.js version:

```bash
node --version
npm --version
```

## Install

### From NPM

```bash
npm install -g @agentscope/studio

# Then run the following command to start AgentScope-Studio:
as_studio
```

### From Source

```bash
git clone https://github.com/agentscope-ai/agentscope-studio
cd agentscope-studio
npm install

# Then run the following command to start AgentScope-Studio:
npm run dev
```

## Connect to AgentScope-Studio

In an AgentScope project, set the `studio_url` field in the `init` function as follows:

```python
import agentscope

agentscope.init(
    ...
    # Replace with the port you started AgentScope-Studio on
    studio_url="http://localhost:3000",
)
```

## Configuration

To configure AgentScope-Studio settings, you can create a `.env` file where you start AgentScope-Studio.
Here are some common configuration options:

> 💡 **Tip**: We are working on adding more configuration options. Stay tuned!

```env
PORT=3000
OTEL_GRPC_PORT=4317
```
