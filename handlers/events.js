const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "../events");
  const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));

      if (!event.name || typeof event.execute !== "function") {
        client.logger.log(
          `> ⚠️ • Invalid event structure in "${file}"`,
          "warn"
        );
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      client.logger.log(
        `> 🔃 • Loaded event "${event.name}" from ${file}`,
        "event"
      );
    } catch (err) {
      client.logger.log(`> ❌ • Failed to load event from "${file}"`, "error");
      client.logger.log(err, "error");
    }
  }

  client.logger.log(`> ✅ • All EVENT successfully loaded`, "success");
};
