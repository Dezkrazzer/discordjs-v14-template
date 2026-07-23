import chalk from "chalk";
import momentTz from "moment-timezone";
import ConfigManager from "../config/ConfigManager.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Logger — Structured Console Logger with Color-Coded Output
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides color-coded, timestamped console logging with support for:
 *   - Multiple log levels: info, warn, error, cmd, event, success, debug
 *   - Optional label prefix (for multi-bot identification)
 *   - Debug level only visible when DEV_MODE is enabled
 *   - Configurable timezone via config.jsonc
 *
 * Usage:
 *   const logger = new Logger("Bot-1");
 *   logger.info("Bot is online");
 *   logger.error("Something went wrong");
 *   logger.debug("Verbose debug info");  // Only shown if DEV_MODE=true
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class Logger {
	/**
	 * @param {string} [label=""] - Optional label prefix for log messages (e.g., bot name)
	 */
	constructor(label = "") {
		/** @type {string} Label prefix for multi-bot clarity */
		this.label = label;

		// Cache config values to avoid repeated lookups
		/** @type {ConfigManager} */
		this._config = ConfigManager.getInstance();
	}

	/**
	 * Formats the current timestamp using the configured timezone.
	 * @returns {string} Formatted date string
	 * @private
	 */
	_getTimestamp() {
		const timezone = this._config.get("DEFAULT_TIMEZONE", "UTC");
		const format = this._config.get("DEFAULT_TIMEZONE_FORMAT", "ddd MMM Do YYYY HH:mm:ss");
		return momentTz().tz(timezone).format(format);
	}

	/**
	 * Builds the log prefix with timestamp and optional bot label.
	 *
	 * @param {string} level - The log level label (e.g., "INFO", "ERROR")
	 * @returns {string} Formatted prefix string
	 * @private
	 */
	_buildPrefix(level) {
		const date = this._getTimestamp();
		const labelStr = this.label ? ` [${this.label}]` : "";
		// Pad level name to 12 chars for aligned output
		const paddedLevel = level.padEnd(12);
		return chalk.hex("#1FAC64")(` ❯ ${paddedLevel}${chalk.hex("#1FAC64")(`[${date}]`)}${labelStr} `);
	}

	/**
	 * Core log method. Routes to the appropriate color based on log type.
	 *
	 * @param {string} content - The message to log
	 * @param {string} [type="info"] - Log level: info, warn, error, cmd, event, success, debug
	 */
	log(content, type = "info") {
		switch (type) {
			case "info":
				return this.info(content);
			case "warn":
				return this.warn(content);
			case "error":
				return this.error(content);
			case "cmd":
				return this.cmd(content);
			case "event":
				return this.event(content);
			case "success":
				return this.success(content);
			case "debug":
				return this.debug(content);
			default:
				throw new TypeError(
					`Logger type must be one of: info, warn, error, cmd, event, success, debug. ` +
					`Received: "${type}"`
				);
		}
	}

	/** Logs an informational message (blue text). */
	info(content) {
		console.log(`${this._buildPrefix("INFO")}${chalk.hex("#59a5e9")(content)}`);
	}

	/** Logs a warning message (yellow text). */
	warn(content) {
		console.log(`${this._buildPrefix("WARNING")}${chalk.hex("#ffd966")(content)}`);
	}

	/** Logs an error message (red text). */
	error(content) {
		console.log(`${this._buildPrefix("ERROR")}${chalk.hex("#E06666")(content)}`);
	}

	/** Logs a command execution message (green text). */
	cmd(content) {
		console.log(`${this._buildPrefix("COMMANDS")}${chalk.hex("#1FAC64")(content)}`);
	}

	/** Logs an event message (green text). */
	event(content) {
		console.log(`${this._buildPrefix("EVENTS")}${chalk.hex("#1FAC64")(content)}`);
	}

	/** Logs a success message (green text). */
	success(content) {
		console.log(`${this._buildPrefix("SUCCESS")}${chalk.hex("#1FAC64")(content)}`);
	}

	/**
	 * Logs a debug message (magenta text).
	 * Only outputs when DEV_MODE is enabled in config.
	 */
	debug(content) {
		if (!this._config.isDev) return;
		console.log(`${this._buildPrefix("DEBUG")}${chalk.hex("#B47EDE")(content)}`);
	}
}

export default Logger;