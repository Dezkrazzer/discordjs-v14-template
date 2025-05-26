const discord = require("discord.js");
const { REST, Routes } = require('discord.js');
const config = require("./config.json");
const path = require("path");
const fs = require("fs");
require("./server.js");

async function deploySlashCommands(client) {
  const commands = [];
  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, file));
      if ("data" in command) commands.push(command.data.toJSON());
    }
  }

  const rest = new REST({ version: "10" }).setToken(config.token);
  try {
    client.logger.log(`> 🔃 • Registering slash commands...`, "event");
    await rest.put(Routes.applicationCommands(client.application.id), {
      body: commands,
    });
    client.logger.log(
      `> ✅ • Slash commands registered successfully`,
      "success"
    );
  } catch (error) {
    client.logger.log(
      `> ❌ • Failed to register slash commands: ${error.message}`,
      "error"
    );
  }
}

(async () => {
  const client = new discord.Client({
    closeTimeout: 3000,
    waitGuildTimeout: 15000,
    intents: [
      discord.GatewayIntentBits.Guilds,
      discord.GatewayIntentBits.GuildMessages,
      discord.GatewayIntentBits.GuildMembers,
      discord.GatewayIntentBits.MessageContent,
    ],
    allowedMentions: { parse: ["users"], repliedUser: true },
    sweepers: {
      ...discord.Options.DefaultSweeperSettings,
      messages: { interval: 3600, lifetime: 1800 },
    },
  });

  client.commands = new discord.Collection();
  client.aliases = new discord.Collection();
  client.config = config;
  client.logger = require("./utils/logger");

  ["commands", "events"].forEach((handler) => {
    require(`./handlers/${handler}`)(client);
  });

  client.on("error", (err) => client.logger.log(err.stack, "error"));
  client.on("warn", (info) => client.logger.log(info, "warn"));
  process.on("unhandledRejection", (err) =>
    client.logger.log("UNHANDLED_REJECTION\n" + err.stack, "error")
  );
  process.on("uncaughtException", (err) => {
    client.logger.log("UNCAUGHT_EXCEPTION\n" + err.stack, "error");
    client.logger.log("Uncaught Exception is detected, restarting...", "info");
    process.exit(1);
  });

  client.once("ready", async () => {
    client.logger.log(
      `> ✅ • ${client.user.username}#${client.user.discriminator} ready to service!`,
      "success"
    );
    await client.application.fetch();
    await deploySlashCommands(client);
  });

  client.login(config.token).catch(() => {
    client.logger.log("Invalid TOKEN!", "warn");
  });
})();
