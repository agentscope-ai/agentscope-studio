<p align="center">
  <img
    src="https://img.alicdn.com/imgextra/i1/O1CN01nTg6w21NqT5qFKH1u_!!6000000001621-55-tps-550-550.svg"
    alt="AgentScope Logo"
    width="200"
  />
</p>

<h2 align="center">AgentScope Studio: Development-Oriented Visualization Toolkit</h2>

<p align="center">
    <a href="https://arxiv.org/abs/2402.14034">
        <img
            src="https://img.shields.io/badge/cs.MA-2402.14034-B31C1C?logo=arxiv&logoColor=B31C1C"
            alt="arxiv"
        />
    </a>
    <a href="https://www.npmjs.com/package/@agentscope/studio">
        <img
            src="https://img.shields.io/badge/dynamic/json?url=https://registry.npmjs.org/%40agentscope%2Fstudio&query=$.%27dist-tags%27.latest&prefix=v&logo=npm&label=version"
            alt="npm"
        />
    </a>
    <a href="./LICENSE">
        <img
            src="https://img.shields.io/badge/license-Apache--2.0-black"
            alt="license"
        />
    </a>
    <a href="https://agentscope.io/">
        <img
            src="https://img.shields.io/badge/Tracing-OpenTelemetry-blue?logo=look&logoColor=green&color=dark-green"
            alt="tracing"
        />
    </a>
    <a href="https://agentscope.io/">
        <img
            src="https://img.shields.io/badge/Evaluation-Agent-blue?logo=look&color=red"
            alt="evaluation"
        />
    </a>
    <a href="https://agentscope.io/">
        <img
            src="https://img.shields.io/badge/Built--in_Copilot-Friday-blue?logo=look&color=cyan"
            alt="friday"
        />
    </a>
</p>

AgentScope Studio is a powerful **local visualization toolkit** designed for developers working with [AgentScope](https://github.com/agentscope-ai/agentscope). It provides a **transparent**, **simple**, and **fun** way to develop, debug, and evaluate agent-based applications.

## Key Features

- **Project Management**: Organize and manage your AgentScope projects with Projects and Runs
- **Runtime Visualization**: Chatbot-style interface for real-time agent interaction
- **Tracing**: OpenTelemetry-based trace visualization for LLM calls, token usage, and agent invocations
- **Agent Evaluation**: Evaluation-oriented analysis from a statistical perspective
- **Built-in Copilot (Friday)**: A development assistant, playground for rapid secondary development, and integration hub for advanced features

<p align="center">
    <img
        src="https://img.alicdn.com/imgextra/i1/O1CN01PG2MdF1Zc44A1QM6N_!!6000000003214-1-tps-1971-1080.gif"
        width="49%"
        alt="home"
    />
    <img
        src="https://img.alicdn.com/imgextra/i2/O1CN01pGHedL1L4ibmyPeiq_!!6000000001246-1-tps-1971-1080.gif"
        width="49%"
        alt="runtime"
    />
    <img
        src="https://img.alicdn.com/imgextra/i1/O1CN01HfFhy928SSJAcWQ8c_!!6000000007931-1-tps-1971-1080.gif"
        width="49%"
        alt="traces"
    />
    <img
        src="https://img.alicdn.com/imgextra/i1/O1CN01vovov821Arms9tEJ1_!!6000000006945-1-tps-1971-1080.gif"
        width="49%"
        alt="friday"
    />
</p>

## 📢 News

- **[2025-08]** AgentScope Studio is now open-sourced! We will continue to improve it and welcome contributions from the community.

## 💻 Installation

### Prerequisites

- **Node.js >= 20.0.0**
- **npm >= 10.0.0**

> **💡 Tip**: If you're using [nvm](https://github.com/nvm-sh/nvm), you can run `nvm use` to automatically switch to the required Node.js version.

```bash
# How to check your version
node --version  # Should show v20.x.x or higher
npm --version   # Should show 10.x.x or higher
```

### From NPM (Recommended)

```bash
npm install -g @agentscope/studio

# Start AgentScope Studio
as_studio
```

### From Source

```bash
git clone https://github.com/agentscope-ai/agentscope-studio
cd agentscope-studio
npm install

# Start in development mode
npm run dev
```

## 🚀 QuickStart

To connect AgentScope applications, you need to set the `studio_url` field in the `AgentScope` initializer as follows:

```python
import agentscope

agentscope.init(
    # ...
    studio_url="http://localhost:3000"
)

# ...
```

## 📚 Documentation

For more details, please refer to our documentation:

- [Overview](./docs/tutorial/en/tutorial/overview.md) - What is AgentScope Studio and how it works
- [Quick Start](./docs/tutorial/en/tutorial/quick_start.md) - Installation and configuration guide
- [Project Management](./docs/tutorial/en/develop/project.md) - Managing projects and runs
- [Tracing](./docs/tutorial/en/develop/tracing.md) - OpenTelemetry integration and semantic conventions
- [Friday](./docs/tutorial/en/agent/friday.md) - Built-in Copilot guide
- [Contributing](./docs/tutorial/en/tutorial/contributing.md) - How to contribute

## ⚖️ License

AgentScope Studio is released under [Apache License 2.0](./LICENSE).

## ✨ Contributors

All thanks to our contributors:

<a href="https://github.com/agentscope-ai/agentscope-studio/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=agentscope-ai/agentscope-studio&max=999&columns=12&anon=1" />
</a>
