/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BaseEvent — Abstract Event Listener Class
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * All event files in src/events/ must export a class extending BaseEvent.
 * This enforces a consistent structure for event registration.
 *
 * Properties:
 *   - name    (string)   The Discord.js event name (e.g., "ready", "messageCreate")
 *   - once    (boolean)  If true, the listener fires only once
 *
 * Usage:
 *   class ReadyEvent extends BaseEvent {
 *     constructor() {
 *       super({ name: "ready", once: true });
 *     }
 *     async execute(client) { ... }
 *   }
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class BaseEvent {
	/**
	 * @param {Object} options - Event configuration
	 * @param {string} options.name - Discord.js event name
	 * @param {boolean} [options.once=false] - Whether the event should only fire once
	 */
	constructor(options = {}) {
		if (!options.name || typeof options.name !== "string") {
			throw new Error(
				`BaseEvent requires a valid "name" string. ` +
				`Received: ${JSON.stringify(options.name)}`
			);
		}

		/** @type {string} The Discord.js event name */
		this.name = options.name;

		/** @type {boolean} Whether this event listener fires only once */
		this.once = options.once ?? false;
	}

	/**
	 * Execute the event handler. Must be overridden by subclasses.
	 *
	 * @param  {...any} args - Event arguments passed by Discord.js
	 * @returns {Promise<void>}
	 * @abstract
	 */
	async execute(..._args) {
		throw new Error(
			`Event "${this.name}" does not implement the execute() method. ` +
			"All events extending BaseEvent must override execute()."
		);
	}
}

module.exports = BaseEvent;
