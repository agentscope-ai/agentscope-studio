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
            src="https://img.shields.io/badge/npm-v1.0.4-blue?logo=npm"
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

AgentScope Studio is a powerful **local visualization toolkit** for the development of agent applications, supporting

- project **management**, 
- **chatbot-style** visualization, 
- **tracing**, and 
- **agent evaluation**.

In addition, AgentScope Studio built-in a Copilot named **Friday** as 

- a development assistant, 
- playground for rapid secondary development, and 
- integration of advanced features in [AgentScope](https://github.com/agentscope-ai/agentscope).

<p align="center">
    <img
        src="./assets/home.gif"
        width="49%"
        alt="home"  
    />
    <img 
        src="./assets/projects.gif"
        width="49%"
        alt="projects" 
    />    
    <img
        src="./assets/runtime.gif"
        width="49%"
        alt="runtime"
    />
    <img 
        src="./assets/friday.gif"
        width="49%"
        alt="friday" 
    />
</p>

## 📢 News

- **[2025-08]** AgentScope Studio is now open-sourced! We will continue to improve it and welcome contributions from the community.

## 💻 Installation

- From source code:

```bash
git clone https://github.com/agentscope-ai/agentscope-studio
npm install
npm run dev
```

- From npm

```bash
npm install -g @agentscope/studio  # or npm install @agentscope/studio

as_studio
```

> Note: For Windows users, it's recommended to use WSL (Windows Subsystem for Linux) to install and run AgentScope Studio.

## 🚀 QuickStart

To connect AgentScope applications, you need to set the `studio_url` field in the `AgentScope` initializer as follows:

```python
import agentscope

agentscope.init(
    studio_url="http://localhost:{port}"  # replace {port} with the actual port number
)

# ...
```

## 📚 About AgentScope Friday

Friday is implemented based on [AgentScope](https://github.com/agentscope-ai/agentscope).

We are keeping integrating more advanced features into Friday, such as:
- [x] Meta tool
- [ ] Long-term memory
- [ ] Dynamic Add MCP

## ⚖️ License

AgentScope is released under Apache License 2.0.

## ✨ Contributors

All thanks to our contributors:

<a href="https://github.com/agentscope-ai/agentscope-studio/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=agentscope-ai/agentscope-studio&max=999&columns=12&anon=1" />
</a>
