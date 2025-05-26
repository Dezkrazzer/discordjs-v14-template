const discord = require("discord.js");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    client.user.setPresence({ status: "online" });
    client.user.setActivity(`Created by DezkrazzeR`, {
      type: discord.ActivityType.Watching,
    });

    client.logger.log(`> ✅ • ${client.user.username}#${client.user.discriminator} is online`, "success");
  },
};