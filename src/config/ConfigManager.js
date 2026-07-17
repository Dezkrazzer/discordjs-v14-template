const fs = require("node:fs");
const path = require("node:path");

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ConfigManager — Singleton Configuration Loader
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Dual-configuration approach:
 *   1. `.env` file → sensitive secrets (loaded by dotenv before this runs)
 *   2. `config.jsonc` → user-friendly settings (embed colors, prefix, etc.)
 *
 * This class strips JSON comments (// and /* ... *​/) from config.jsonc,
 * parses it, and exposes values through a clean API.
 *
 * Usage:
 *   const config = ConfigManager.getInstance();
 *   config.get("MAIN_PREFIX");  // "!"
 *   config.isDev;               // true/false
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class ConfigManager {
	/** @type {ConfigManager|null} Singleton instance */
	static #instance = null;

	/** @type {Object} Parsed configuration data */
	#data = {};

	/**
	 * Private constructor — use ConfigManager.getInstance() instead.
	 * Loads and parses config.jsonc from the project root.
	 */
	constructor() {
		if (ConfigManager.#instance) {
			throw new Error("ConfigManager is a singleton. Use ConfigManager.getInstance().");
		}

		this.#loadConfig();
	}

	/**
	 * Returns the singleton ConfigManager instance.
	 * Creates it on first call.
	 * @returns {ConfigManager}
	 */
	static getInstance() {
		if (!ConfigManager.#instance) {
			ConfigManager.#instance = new ConfigManager();
		}
		return ConfigManager.#instance;
	}

	/**
	 * Loads config.jsonc from the project root directory.
	 * Strips single-line (//) and multi-line (/* *​/) comments before parsing.
	 * @private
	 */
	#loadConfig() {
		const configPath = path.resolve(process.cwd(), "config.jsonc");

		if (!fs.existsSync(configPath)) {
			throw new Error(
				`Configuration file not found at: ${configPath}\n` +
				"Please create a config.jsonc file in the project root."
			);
		}

		try {
			const raw = fs.readFileSync(configPath, "utf-8");
			const stripped = this.#stripJsonComments(raw);
			this.#data = JSON.parse(stripped);
		} catch (error) {
			if (error instanceof SyntaxError) {
				throw new Error(
					`Failed to parse config.jsonc: ${error.message}\n` +
					"Please check for syntax errors in your configuration file."
				);
			}
			throw error;
		}
	}

	/**
	 * Strips both single-line (//) and multi-line (/* *​/) comments from a
	 * JSON string, while preserving strings that contain comment-like sequences.
	 *
	 * @param {string} jsonString - Raw JSONC content
	 * @returns {string} Clean JSON string ready for parsing
	 * @private
	 */
	#stripJsonComments(jsonString) {
		// This regex matches:
		//   1. Double-quoted strings (preserves them)
		//   2. Single-line comments (// ...)
		//   3. Multi-line comments (/* ... */)
		return jsonString.replace(
			/("(?:[^"\\]|\\.)*")|\/\/[^\n\r]*|\/\*[\s\S]*?\*\//g,
			(_match, stringLiteral) => {
				// If the match is a quoted string, keep it as-is
				if (stringLiteral) return stringLiteral;
				// Otherwise it's a comment — replace with empty string
				return "";
			}
		);
	}

	/**
	 * Retrieves a configuration value by key.
	 * Supports dot-notation for nested values (e.g., "BOT_STATUS.STATUS").
	 *
	 * @param {string} key - The configuration key (dot-notation supported)
	 * @param {*} [defaultValue=null] - Fallback value if key is not found
	 * @returns {*} The configuration value
	 */
	get(key, defaultValue = null) {
		const keys = key.split(".");
		let value = this.#data;

		for (const k of keys) {
			if (value === undefined || value === null || typeof value !== "object") {
				return defaultValue;
			}
			value = value[k];
		}

		return value !== undefined ? value : defaultValue;
	}

	/**
	 * Returns the entire configuration object (read-only copy).
	 * @returns {Object} Frozen copy of the configuration data
	 */
	getAll() {
		return Object.freeze({ ...this.#data });
	}

	// ─── Convenience Getters ───────────────────────────────────────────────────

	/** @returns {boolean} Whether developer mode is enabled */
	get isDev() {
		return this.get("DEV_MODE", false) === true;
	}

	/** @returns {boolean} Whether slash commands are enabled */
	get slashEnabled() {
		return this.get("ENABLE_SLASH_COMMANDS", true) === true;
	}

	/** @returns {string} The default command prefix */
	get prefix() {
		return this.get("MAIN_PREFIX", "!");
	}

	/** @returns {string|null} The dev/test guild ID for slash command registration */
	get devGuildId() {
		return process.env.DEV_GUILD_ID?.trim() || this.get("DEV_GUILD_ID", null);
	}

	/** @returns {string[]} Array of developer user IDs */
	get devIds() {
		const envValue = process.env.DEV_IDS?.trim();
		if (envValue) {
			return envValue
				.split(",")
				.map((id) => id.trim())
				.filter(Boolean);
		}

		return this.get("DEV_IDS", []);
	}

	/** @returns {Object} Embed color configuration */
	get embedColors() {
		return this.get("EMBED_COLORS", {
			PRIMARY: "#5865F2",
			SUCCESS: "#57F287",
			WARNING: "#FEE75C",
			ERROR: "#ED4245",
		});
	}

	/** @returns {string} The configured language */
	get language() {
		return this.get("LANGUAGE", "en");
	}
}

module.exports = ConfigManager;
