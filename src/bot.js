/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Bot Bootstrap — Single Client Startup Script
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file is the bootstrap for a single BotClient instance.
 * It is used in TWO scenarios:
 *
 *   1. SHARDING MODE: Spawned by ShardingManager as a child process.
 *      The token is passed automatically by the ShardingManager.
 *
 *   2. DIRECT EXECUTION: Can be run directly for development/testing
 *      (reads token from DISCORD_TOKEN env variable).
 *
 * Lifecycle:
 *   1. Load environment variables
 *   2. Create BotClient instance
 *   3. Initialize (load commands & events)
 *   4. Start (login to Discord)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

require("dotenv").config();

const BotClient = require("./structures/BotClient.js");

(async () => {
	// In sharding mode, the token is injected by ShardingManager.
	// For direct execution, fall back to the first token in DISCORD_TOKEN.
	const token = process.env.DISCORD_TOKEN?.split(",")[0]?.trim();

	if (!token) {
		console.error(
			"[FATAL] No bot token available. " +
			"Ensure DISCORD_TOKEN is set in your .env file."
		);
		process.exit(1);
	}

	const client = new BotClient(token);

	// ── Process-level error handlers for shard processes ──────────────────
	process.on("unhandledRejection", (error) => {
		client.logger.error(`UNHANDLED_REJECTION\n${error?.stack ?? error}`);
	});

	process.on("uncaughtException", (error) => {
		client.logger.error(`UNCAUGHT_EXCEPTION\n${error?.stack ?? error}`);
		client.logger.error("Uncaught exception detected, restarting...");
		process.exit(1);
	});

	try {
		await client.initialize();
		await client.start();
	} catch (error) {
		console.error("[FATAL] Bot failed to start:", error);
		process.exit(1);
	}
})();
