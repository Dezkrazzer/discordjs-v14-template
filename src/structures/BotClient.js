const { Client, GatewayIntentBits, Options, Collection } = require("discord.js");
const ConfigManager = require("../config/ConfigManager.js");
const CommandManager = require("./CommandManager.js");
const EventManager = require("./EventManager.js");
const EmbedManager = require("./EmbedManager.js");
const Logger = require("../utils/logger.js");

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BotClient — Extended Discord.js Client
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Custom Client class that encapsulates all bot-specific state:
 *   - Commands & Aliases collections
 *   - Configuration (ConfigManager singleton)
 *   - Logger instance (with optional bot label for multi-bot mode)
 *   - CommandManager & EventManager instances
 *
 * Lifecycle:
 *   1. new BotClient(token, label)    → Constructor sets up intents, collections
 *   2. client.initialize()            → Loads commands and events
 *   3. client.start()                 → Logs in to Discord
 *
 * Usage:
 *   const bot = new BotClient("TOKEN_HERE", "Bot-1");
 *   await bot.initialize();
 *   await bot.start();
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class BotClient extends Client {
	/**
	 * @param {string} token - The bot token for authentication
	 * @param {string} [label=""] - A human-readable label for logging (useful in multi-bot mode)
	 */
	constructor(token, label = "") {
		// ── Configure Discord.js Client options ───────────────────────────────
		super({
			closeTimeout: 3_000,
			waitGuildTimeout: 15_000,
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildPresences,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildVoiceStates,
			],
			allowedMentions: { parse: ["users"], repliedUser: true },
			sweepers: {
				...Options.DefaultSweeperSettings,
				messages: { interval: 3_600, lifetime: 1_800 },
			},
		});

		// ── Bot authentication token ──────────────────────────────────────────
		/** @type {string} The Discord bot token */
		this._token = token;

		// ── Bot label for multi-bot identification ────────────────────────────
		/** @type {string} Human-readable label (e.g., "Bot-1") */
		this.label = label;

		// ── Configuration ─────────────────────────────────────────────────────
		/** @type {ConfigManager} Shared configuration manager */
		this.config = ConfigManager.getInstance();

		// ── Logger ────────────────────────────────────────────────────────────
		/** @type {Logger} Logger instance with optional bot label */
		this.logger = new Logger(label);

		// ── Collections ───────────────────────────────────────────────────────
		/** @type {Collection<string, import('./BaseCommand')>} Loaded commands by name */
		this.commands = new Collection();

		/** @type {Collection<string, string>} Alias → command name mapping */
		this.aliases = new Collection();

		// ── Managers ──────────────────────────────────────────────────────────
		/** @type {CommandManager} Handles command loading, registration, and cooldowns */
		this.commandManager = new CommandManager(this);

		/** @type {EventManager} Handles event loading and registration */
		this.eventManager = new EventManager(this);

		/** @type {EmbedManager} Handles uniform embed responses (YES, NO, ERROR, WARNING, INFO, LOADING) */
		this.embedManager = new EmbedManager();

		// ── Multi-bot reference ───────────────────────────────────────────────
		/**
		 * @type {import('./MultiBotManager')|null}
		 * Set by MultiBotManager when running in multi-bot mode.
		 * Used by event handlers to check delegation.
		 */
		this.multiBotManager = null;
	}

	/**
	 * Initializes the bot by loading all commands and events.
	 * Call this before start() to ensure handlers are ready before login.
	 *
	 * @returns {Promise<void>}
	 */
	async initialize() {
		this.logger.info(`> 🔧 • Initializing bot${this.label ? ` [${this.label}]` : ""}...`);

		// Load all commands from src/commands/<category>/
		await this.commandManager.loadAll();

		// Load all events from src/events/
		await this.eventManager.loadAll();

		// ── Global error handlers ─────────────────────────────────────────────
		this.on("error", (err) =>
			this.logger.error(`CLIENT_ERROR\n${err.stack}`)
		);
		this.on("warn", (info) =>
			this.logger.warn(info)
		);
	}

	/**
	 * Starts the bot by logging in with the stored token.
	 *
	 * @returns {Promise<void>}
	 */
	async start() {
		try {
			await this.login(this._token);
		} catch (error) {
			this.logger.error(
				`> ❌ • Failed to login${this.label ? ` [${this.label}]` : ""}: ${error.message}`
			);
			this.logger.error(
				"> ❌ • Please verify your DISCORD_TOKEN in the .env file is valid."
			);
			throw error;
		}
	}
}

module.exports = BotClient;
