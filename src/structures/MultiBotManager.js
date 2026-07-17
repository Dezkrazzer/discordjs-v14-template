const BotClient = require("./BotClient.js");
const Logger = require("../utils/logger.js");

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MultiBotManager — Multi-Bot Instance Orchestrator
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * When multiple Discord tokens are provided (comma-separated in .env),
 * this manager instantiates and coordinates multiple BotClient instances
 * running simultaneously within the same Node.js process.
 *
 * ── Delegation System ──
 * In a shared guild (where multiple bots are present), only ONE bot should
 * respond to general commands to prevent duplicate responses. The delegation
 * rules are:
 *
 *   1. The FIRST token/bot is designated as the "primary" bot.
 *   2. In any guild where the primary bot is present, it handles all commands.
 *   3. Secondary bots only handle commands in guilds where the primary bot
 *      is NOT present (e.g., the secondary bot was invited alone).
 *   4. Commands marked as `devOnly` are NOT subject to delegation —
 *      any bot can respond to dev commands regardless of delegation.
 *
 * This ensures clean multi-bot behavior without command conflicts.
 *
 * Usage:
 *   const manager = new MultiBotManager(["token1", "token2"]);
 *   await manager.startAll();
 *   // Later:
 *   await manager.shutdownAll();
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class MultiBotManager {
	/**
	 * @param {string[]} tokens - Array of Discord bot tokens
	 */
	constructor(tokens) {
		if (!Array.isArray(tokens) || tokens.length === 0) {
			throw new Error("MultiBotManager requires a non-empty array of tokens.");
		}

		/** @type {Logger} Manager-level logger (no bot label) */
		this.logger = new Logger("MultiBotManager");

		/**
		 * @type {Map<string, BotClient>}
		 * Map of bot label → BotClient instance.
		 * Labels are "Bot-1", "Bot-2", etc.
		 */
		this.clients = new Map();

		/**
		 * @type {string|null}
		 * The label of the primary bot (first token).
		 * Used for delegation decisions.
		 */
		this.primaryLabel = null;

		// ── Instantiate BotClient for each token ──────────────────────────────
		for (let i = 0; i < tokens.length; i++) {
			const label = `Bot-${i + 1}`;
			const client = new BotClient(tokens[i].trim(), label);

			// Give each client a reference back to this manager
			client.multiBotManager = this;

			this.clients.set(label, client);

			// The first bot is the primary
			if (i === 0) {
				this.primaryLabel = label;
			}
		}

		this.logger.info(
			`> 🤖 • Created ${tokens.length} bot instance(s) ` +
			`(primary: ${this.primaryLabel})`
		);
	}

	/**
	 * Returns the primary BotClient instance.
	 * @returns {BotClient}
	 */
	get primaryClient() {
		return this.clients.get(this.primaryLabel);
	}

	/**
	 * Determines whether a given client should handle commands in a guild.
	 *
	 * Delegation logic:
	 *   - If the client IS the primary bot → always handle
	 *   - If the client is a secondary bot AND the primary bot is also in
	 *     the same guild → DO NOT handle (let primary respond)
	 *   - If the client is a secondary bot AND the primary bot is NOT in
	 *     the guild → handle (this bot is the only one there)
	 *
	 * @param {BotClient} client - The client being checked
	 * @param {string} guildId - The guild ID to check delegation for
	 * @returns {boolean} True if this client should handle commands in the guild
	 */
	isDelegatedHandler(client, guildId) {
		// Primary bot always handles
		if (client.label === this.primaryLabel) {
			return true;
		}

		// For secondary bots: check if the primary bot is in this guild
		const primary = this.primaryClient;
		if (primary?.guilds.cache.has(guildId)) {
			// Primary is present → let it handle, this secondary should not
			return false;
		}

		// Primary is NOT in this guild → this secondary bot should handle
		return true;
	}

	/**
	 * Initializes and starts all bot clients concurrently.
	 *
	 * Each client goes through:
	 *   1. initialize() — loads commands and events
	 *   2. start() — logs in to Discord
	 *
	 * If any single bot fails to start, the others will still attempt to start.
	 * Failures are logged but do not crash the entire manager.
	 *
	 * @returns {Promise<void>}
	 */
	async startAll() {
		this.logger.info("> 🚀 • Starting all bot instances...");

		const startPromises = [];

		for (const [label, client] of this.clients) {
			const promise = (async () => {
				try {
					await client.initialize();
					await client.start();
					this.logger.success(`> ✅ • ${label} started successfully`);
				} catch (error) {
					this.logger.error(
						`> ❌ • ${label} failed to start: ${error.message}`
					);
				}
			})();

			startPromises.push(promise);
		}

		await Promise.allSettled(startPromises);
		this.logger.info("> 🏁 • All bot startup attempts completed");
	}

	/**
	 * Gracefully shuts down all bot clients.
	 * Destroys each client connection and clears the clients map.
	 *
	 * @returns {Promise<void>}
	 */
	async shutdownAll() {
		this.logger.info("> 🔌 • Shutting down all bot instances...");

		for (const [label, client] of this.clients) {
			try {
				client.destroy();
				this.logger.info(`> ✅ • ${label} disconnected`);
			} catch (error) {
				this.logger.error(
					`> ❌ • Failed to disconnect ${label}: ${error.message}`
				);
			}
		}

		this.clients.clear();
		this.logger.success("> ✅ • All bots shut down");
	}
}

module.exports = MultiBotManager;
