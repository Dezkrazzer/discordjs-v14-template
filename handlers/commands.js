const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

module.exports = (client) => {
  client.commands = new Collection();
  client.slashArray = [];

  const foldersPath = path.join(__dirname, "../commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);

      if (!command.name) {
        client.logger.log(
          `> ⚠️ • Command "${file}" skipped: no 'name' property`,
          "warn"
        );
        continue;
      }

      client.commands.set(command.name, command);

      if (command.data && typeof command.data.name === "string") {
        client.slashArray.push(command.data.toJSON());
      } else {
        client.logger.log(
          `> ⚠️ • Command "${file}" has no valid 'data' for slash`,
          "warn"
        );
      }
    }
  }

  client.logger.log(`> ✅ • All commands loaded successfully`, "success");
};
