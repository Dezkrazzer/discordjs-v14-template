<div align="center">
  <h1>🤖 Discord.js v14 Bot Template</h1>
  <p>A professional, highly customizable, and feature-rich Discord Bot Template built with Discord.js v14.</p>
  
  <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js v14">
  <img src="https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=white" alt="JavaScript">
  <img src="https://img.shields.io/badge/License-MIT-red?style=for-the-badge" alt="License">
</div>

---

## 📑 Table of Contents

- [Description](#-description)
- [Features](#-features)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Project Structure](#-project-structure)
- [Author & Copyright](#-author--copyright)
- [License](#-license)

---

## 📝 Description

This template provides a robust foundation for building Discord bots using **[Discord.js v14](https://discord.js.org/)**. It is designed with modularity, scalability, and developer experience in mind. Whether you are building a simple utility bot or a complex multi-bot system that requires sharding, this template comes pre-configured with essential managers, a clean structure, and extensive configuration options to kickstart your development.

---

## ✨ Features

- **Discord.js v14 Ready**: Fully updated to support the latest Discord API features.
- **Hybrid Command System**: Seamlessly supports both Slash Commands (`/`) and traditional Prefix Commands (`!`).
- **Multi-Bot Support**: Run multiple bot instances simultaneously from a single process using comma-separated tokens.
- **Automatic Sharding**: Built-in support to auto-enable sharding once your bot reaches a configurable guild threshold.
- **Advanced Embed Manager**: A centralized system for building beautiful, consistent embeds with predefined colors, emojis, and auto-deletion capabilities for temporary messages and cooldowns.
- **Express Web Server**: Integrated lightweight Express server for easy uptime monitoring and ping tracking.
- **Developer Mode**: Quickly test commands in a specific test guild, restrict command access to developers, and get verbose error logging during development.
- **Easy Configuration**: Highly customizable via `.env` and `config.jsonc` files without needing to touch core code.
- **Modern Tooling**: Pre-configured with [Biome](https://biomejs.dev/) for blazing-fast formatting and linting.

---

## 🛠 Installation

Follow these steps to get your development environment set up:

### Prerequisites
- [Node.js](https://nodejs.org/) (v24.x or latest recommended).
- [Git](https://git-scm.com/) (optional, for cloning the repository).

### Setup Steps

1. **Clone the repository** (or click "Use this template" on GitHub):
   ```bash
   git clone https://github.com/Dezkrazzer/discordjs-v14-template.git
   cd discordjs-v14-template
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Copy the example environment file and fill in your details.
   ```bash
   cp .env.example .env
   ```
   *(See the [Configuration](#configuration) section below for details on filling out `.env`)*

---

## ⚙ Configuration

The bot uses two main files for configuration:

### 1. Environment Variables (`.env`)
This file stores sensitive data like your bot token and developer IDs. 
- `DISCORD_TOKEN`: Your bot token(s). (Comma-separate tokens for Multi-Bot Mode).
- `DEV_GUILD_ID`: The ID of your test server for instant slash command registration.
- `DEV_IDS`: Comma-separated Discord User IDs for developers who have access to developer-only commands.

### 2. General Configuration (`config.jsonc`)
This file controls the bot's behavior, appearance, and generic settings.
- **Developer Mode**: Toggle `DEV_MODE` to true for verbose logging and test guild command registration.
- **Command Settings**: Configure your `MAIN_PREFIX` and toggle `ENABLE_SLASH_COMMANDS`.
- **Embed Settings**: Customize default embed colors and emojis.
- **Bot Presence**: Set the bot's status, activity type, and text.
- **Sharding**: Adjust the `SHARD_THRESHOLD`.

---

## 🚀 Usage

Once installed and configured, you can start the bot using the following commands:

### Development Mode
Starts the bot directly without the sharding manager (useful for local testing).
```bash
npm run dev
```

### Production Mode
Starts the bot through `index.js`, which handles sharding and multi-bot management if configured.
```bash
npm start
```

### Code Formatting and Linting
To format and lint your code using Biome:
```bash
npm run format
npm run lint
```

---

## 📂 Project Structure

```text
├── .env                  # Environment variables (Tokens, Dev IDs)
├── config.jsonc          # Bot configuration (Prefix, Colors, Presence)
├── package.json          # Project metadata and scripts
├── src/
│   ├── bot.js            # Main bot entry point (Client initialization)
│   ├── server.js         # Express web server
│   ├── index.js          # Sharding & Multi-bot manager entry point
│   ├── commands/         # Command modules (General, Developer, etc.)
│   ├── events/           # Event listeners
│   ├── structures/       # Core managers (CommandManager, EmbedManager, etc.)
│   └── utils/            # Helper functions and utilities
```

---

## 👤 Author & Copyright

- **Author:** [Dezkrazzer](https://lzuardiai.my.id)
- **Co-Author:** [Acro Network Development](https://acronet.work)

© 2026 Dezkrazzer & Acro Network Development. All rights reserved.

---

## 📜 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for more information.
