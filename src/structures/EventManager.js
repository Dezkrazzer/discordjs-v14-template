import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import BaseEvent from "./BaseEvent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EventManager — Event Listener Loader & Registrar
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Scans src/events/ for JavaScript files, validates they export a class
 * extending BaseEvent, and binds them to the Discord.js client using
 * either client.on() or client.once() based on the event's `once` flag.
 *
 * Each event file must export a class (not an instance) extending BaseEvent.
 * The EventManager instantiates each event and registers it.
 *
 * Usage:
 *   const manager = new EventManager(client);
 *   await manager.loadAll();
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class EventManager {
	/**
	 * @param {import('./BotClient')} client - The bot client instance
	 */
	constructor(client) {
		/** @type {import('./BotClient')} */
		this.client = client;
	}

	/**
	 * Loads all event files from src/events/ and registers them on the client.
	 *
	 * Each file should export a class extending BaseEvent, e.g.:
	 *   export default class ReadyEvent extends BaseEvent { ... }
	 *
	 * @returns {Promise<void>}
	 */
	async loadAll() {
		const eventsDir = path.join(__dirname, "..", "events");

		// Ensure the events directory exists
		if (!fs.existsSync(eventsDir)) {
			this.client.logger.warn(
				`> ⚠️ • Events directory not found at: ${eventsDir}`
			);
			return;
		}

		const files = fs.readdirSync(eventsDir)
			.filter((file) => file.endsWith(".js"));

		let loadedCount = 0;

		for (const file of files) {
			try {
				const filePath = path.join(eventsDir, file);
				const { default: EventClass } = await import(pathToFileURL(filePath).href);

				// ── Validate export is a constructor ───────────────────────────
				if (typeof EventClass !== "function") {
					this.client.logger.warn(
						`> ⚠️ • Skipping event "${file}": export is not a class/constructor`
					);
					continue;
				}

				// ── Instantiate and validate ───────────────────────────────────
				const event = new EventClass();

				if (!(event instanceof BaseEvent)) {
					this.client.logger.warn(
						`> ⚠️ • Skipping event "${file}": does not extend BaseEvent`
					);
					continue;
				}

				// ── Register the event listener ────────────────────────────────
				// We pass the client as the last argument so events can access it
				if (event.once) {
					this.client.once(event.name, (...args) =>
						event.execute(...args, this.client)
					);
				} else {
					this.client.on(event.name, (...args) =>
						event.execute(...args, this.client)
					);
				}

				loadedCount++;
				this.client.logger.debug(
					`> 🔃 • Loaded event "${event.name}" from ${file}${event.once ? " (once)" : ""}`
				);
			} catch (error) {
				this.client.logger.error(
					`> ❌ • Failed to load event from "${file}": ${error.message}`
				);
				if (this.client.config.isDev) {
					this.client.logger.debug(error.stack);
				}
			}
		}

		this.client.logger.success(
			`> ✅ • Loaded ${loadedCount} event(s)`
		);
	}
}

export default EventManager;
