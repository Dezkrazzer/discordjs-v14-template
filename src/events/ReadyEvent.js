const { ActivityType } = require("discord.js");
const BaseEvent = require("../structures/BaseEvent.js");

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ClientReadyEvent — Fires once when the bot client is ready
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Uses the "clientReady" event name instead of the deprecated "ready" to
 * avoid the Discord.js v14/v15 deprecation warning:
 *   "DeprecationWarning: The ready event has been renamed to clientReady..."
 *
 * Handles:
 *   1. Setting the bot's presence (status + activity)
 *   2. Registering slash commands via CommandManager
 *   3. Logging the ready confirmation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** @type {Object<string, ActivityType>} Maps string activity types to Discord.js enums */
const ACTIVITY_TYPE_MAP = {
	PLAYING: ActivityType.Playing,
	STREAMING: ActivityType.Streaming,
	LISTENING: ActivityType.Listening,
	WATCHING: ActivityType.Watching,
	COMPETING: ActivityType.Competing,
};

class ClientReadyEvent extends BaseEvent {
	constructor() {
		// ── Use "clientReady" to avoid the deprecated "ready" event ─────────
		super({ name: "clientReady", once: true });
	}

	/**
	 * @param {import('../structures/BotClient')} client - The ready client
	 */
	async execute(client) {
		// ── Set bot presence from config ───────────────────────────────────────
		const botStatus = client.config.get("BOT_STATUS", {});

		client.user.setPresence({
			status: botStatus.STATUS ?? "online",
		});

		client.user.setActivity(botStatus.ACTIVITY ?? "Bot Template", {
			type: ACTIVITY_TYPE_MAP[botStatus.TYPE] ?? ActivityType.Watching,
		});

		// ── Fetch application data (needed for slash command registration) ────
		await client.application.fetch();

		// ── Register slash commands ───────────────────────────────────────────
		await client.commandManager.registerSlashCommands();

		// ── Log ready confirmation ───────────────────────────────────────────
		client.logger.success(
			`> ✅ • ${client.user.username} is online and ready to serve!`
		);
	}
}

module.exports = ClientReadyEvent;