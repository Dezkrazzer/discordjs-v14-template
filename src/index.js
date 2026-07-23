/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Entry Point — Dynamic Sharding & Multi-Bot Router
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This is the main entry point of the application. It determines the startup
 * mode based on the DISCORD_TOKEN environment variable and the bot's guild count.
 *
 *   ┌─────────────────────────────────────────────────────────────────────────┐
 *   │  Condition                      │  Startup Mode                        │
 *   ├─────────────────────────────────────────────────────────────────────────┤
 *   │  Multiple tokens (comma-sep)    │  MultiBotManager (parallel clients)  │
 *   │  Single token, guilds >= 500    │  ShardingManager (auto-scales)       │
 *   │  Single token, guilds < 500     │  Direct BotClient (single process)   │
 *   └─────────────────────────────────────────────────────────────────────────┘
 *
 * Dynamic Sharding:
 *   Before starting, a lightweight REST API call fetches the bot's current
 *   guild count. Sharding is only engaged when the bot is in 500+ guilds
 *   (Discord's recommended threshold). Below that, a single process is used
 *   to avoid the overhead of unnecessary child processes.
 *
 * Multi-Bot Mode:
 *   Uses MultiBotManager to run multiple BotClient instances within the
 *   same Node.js process. A delegation system ensures only one bot responds
 *   per guild to avoid duplicate command responses.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import "dotenv/config";
import Logger from "./utils/logger.js";
global.logger = new Logger("System");
import "./server.js";

import path from "node:path";
import { fileURLToPath } from "node:url";
import ConfigManager from "./config/ConfigManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {ConfigManager} */
const config = ConfigManager.getInstance();

/** @type {number} The guild count threshold at which sharding is enabled (from config) */
const SHARD_THRESHOLD = config.get("SHARD_THRESHOLD", 500);

// ── Validate DISCORD_TOKEN existence ──────────────────────────────────────────
const rawToken = process.env.DISCORD_TOKEN;

if (!rawToken || rawToken.trim().length === 0) {
	console.error(
		"[FATAL] DISCORD_TOKEN is not set in the .env file.\n" +
		"Please create a .env file with your bot token(s). See .env.example for reference."
	);
	process.exit(1);
}

// ── Parse tokens (split by comma for multi-bot support) ───────────────────────
const tokens = rawToken
	.split(",")
	.map((t) => t.trim())
	.filter((t) => t.length > 0);

if (tokens.length === 0) {
	console.error("[FATAL] No valid tokens found in DISCORD_TOKEN.");
	process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-Start REST Check — Fetch Guild Count for Sharding Decision
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches the approximate guild count for a bot token using the Discord REST API.
 * Uses the GET /api/v10/users/@me endpoint with the bot's Authorization header,
 * then fetches /api/v10/users/@me/guilds to count guilds.
 *
 * This is a lightweight pre-start check that runs BEFORE any Client is created.
 *
 * @param {string} token - The bot token to check
 * @returns {Promise<number>} The approximate guild count
 */
async function fetchGuildCount(token) {
	try {
		// Use Discord REST API to fetch the bot's guilds (max 200 per request).
		// If the bot is in 200+ guilds, we paginate with `after` parameter.
		// For the threshold check, we only need to know if count >= SHARD_THRESHOLD.
		const baseUrl = "https://discord.com/api/v10/users/@me/guilds";
		const headers = {
			Authorization: `Bot ${token}`,
			"Content-Type": "application/json",
		};

		let totalGuilds = 0;
		let lastId = "0";
		let hasMore = true;

		while (hasMore) {
			const url = `${baseUrl}?limit=200&after=${lastId}`;
			const response = await fetch(url, { headers });

			if (!response.ok) {
				// If we get rate-limited or an error, log and assume below threshold
				const status = response.status;
				console.warn(
					`  ⚠️ REST API returned status ${status} while fetching guild count. ` +
					"Defaulting to single-process mode."
				);
				return 0;
			}

			const guilds = await response.json();
			totalGuilds += guilds.length;

			// If we've already passed the threshold, no need to count further
			if (totalGuilds >= SHARD_THRESHOLD) {
				return totalGuilds;
			}

			// Check if there are more pages
			if (guilds.length < 200) {
				hasMore = false;
			} else {
				lastId = guilds[guilds.length - 1].id;
			}
		}

		return totalGuilds;
	} catch (error) {
		console.warn(
			`  ⚠️ Failed to fetch guild count: ${error.message}. ` +
			"Defaulting to single-process mode."
		);
		return 0;
	}
}

// ── Route to the appropriate startup mode ─────────────────────────────────────
(async () => {
	// ── Register global error handlers early ─────────────────────────────
	process.on("unhandledRejection", (error) => {
		console.error(`[UNHANDLED_REJECTION]\n${error?.stack ?? error}`);
	});

	process.on("uncaughtException", (error) => {
		console.error(`[UNCAUGHT_EXCEPTION]\n${error?.stack ?? error}`);
		console.error("Uncaught exception detected. Shutting down...");
		process.exit(1);
	});

	if (tokens.length > 1) {
		// ════════════════════════════════════════════════════════════════════
		// MULTI-BOT MODE
		// Multiple tokens detected — run all bots in the same process
		// ════════════════════════════════════════════════════════════════════
		console.log(
			`\n🤖 Multi-Bot Mode — Starting ${tokens.length} bot instances...\n`
		);

		const { default: MultiBotManager } = await import("./structures/MultiBotManager.js");
		const manager = new MultiBotManager(tokens);

		// ── Graceful shutdown on SIGINT/SIGTERM ───────────────────────────
		const shutdown = async () => {
			console.log("\n🔌 Received shutdown signal...");
			await manager.shutdownAll();
			process.exit(0);
		};

		process.on("SIGINT", shutdown);
		process.on("SIGTERM", shutdown);

		await manager.startAll();
	} else {
		// ════════════════════════════════════════════════════════════════════
		// SINGLE-BOT MODE — Dynamic Sharding Decision
		// ════════════════════════════════════════════════════════════════════
		console.log("\n🔍 Checking guild count for sharding decision...\n");

		const guildCount = await fetchGuildCount(tokens[0]);
		console.log(`  📊 Current guild count: ~${guildCount}`);

		if (guildCount >= SHARD_THRESHOLD) {
			// ──────────────────────────────────────────────────────────────
			// SHARDING MODE — Guild count >= 500
			// Use ShardingManager to spawn bot.js in child processes
			// ──────────────────────────────────────────────────────────────
			console.log(
				`\n⚡ Sharding Mode — ${guildCount} guilds detected (>= ${SHARD_THRESHOLD}). ` +
				"Launching ShardingManager...\n"
			);

			const { ShardingManager } = await import("discord.js");

			const manager = new ShardingManager(path.join(__dirname, "bot.js"), {
				token: tokens[0],
				totalShards: "auto",
			});

			// ── Shard lifecycle events ───────────────────────────────────
			manager.on("shardCreate", (shard) => {
				console.log(`  🔷 Shard #${shard.id} launched`);

				shard.on("ready", () => {
					console.log(`  ✅ Shard #${shard.id} ready`);
				});

				shard.on("disconnect", () => {
					console.log(`  ⚠️ Shard #${shard.id} disconnected`);
				});

				shard.on("reconnecting", () => {
					console.log(`  🔄 Shard #${shard.id} reconnecting`);
				});

				shard.on("death", () => {
					console.log(`  💀 Shard #${shard.id} died`);
				});

				shard.on("error", (error) => {
					console.error(`  ❌ Shard #${shard.id} error: ${error.message}`);
				});
			});

			await manager.spawn();
		} else {
			// ──────────────────────────────────────────────────────────────
			// DIRECT MODE — Guild count < 500
			// Start BotClient directly in this process (no sharding overhead)
			// ──────────────────────────────────────────────────────────────
			console.log(
				`\n🚀 Direct Mode — ${guildCount} guilds detected (< ${SHARD_THRESHOLD}). ` +
				"Starting single-process client...\n"
			);

			const { default: BotClient } = await import("./structures/BotClient.js");
			const client = new BotClient(tokens[0]);

			// ── Graceful shutdown ────────────────────────────────────────
			const shutdown = () => {
				console.log("\n🔌 Received shutdown signal...");
				client.destroy();
				process.exit(0);
			};

			process.on("SIGINT", shutdown);
			process.on("SIGTERM", shutdown);

			try {
				await client.initialize();
				await client.start();
			} catch (error) {
				console.error("[FATAL] Bot failed to start:", error);
				process.exit(1);
			}
		}
	}
})();
