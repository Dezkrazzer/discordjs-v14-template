import { SlashCommandBuilder, ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BaseCommand — Abstract Command Class
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class BaseCommand {
	/**
	 * @param {import('./BotClient')} client
	 * @param {Object} options
	 * @param {string} options.name
	 * @param {string} [options.description="No description provided."]
	 * @param {string[]} [options.aliases=[]]
	 * @param {number} [options.cooldown=3]
	 * @param {boolean} [options.devOnly=false]
	 * @param {string|null} [options.contextChat=null]
	 * @param {string|null} [options.contextUser=null]
	 * @param {boolean} [options.disable=false]
	 * @param {string} [options.usage=""]
	 * @param {boolean|Object} [options.slash=false]
	 * @param {string} [options.category="General"]
	 */
	constructor(client, options = {}) {
		if (!options.name || typeof options.name !== "string") {
			throw new Error(
				`BaseCommand requires a valid "name" string. Received: ${JSON.stringify(options.name)}`
			);
		}

		this.client = client;
		this.name = options.name.toLowerCase();
		this.description = options.description ?? "No description provided.";
		this.aliases = options.aliases ?? [];
		this.cooldown = options.cooldown ?? 3;
		this.devOnly = options.devOnly ?? false;
		this.contextChat = options.contextChat ?? null;
		this.contextUser = options.contextUser ?? null;
		this.disable = options.disable ?? false;
		this.usage = options.usage ?? "";
		this.slash = options.slash ?? false;
		this.category = options.category ?? "General";
	}

	/**
	 * @param {import('./CommandContext')} context
	 * @returns {Promise<void>}
	 * @abstract
	 */
	async execute(_context) {
		throw new Error(
			`Command "${this.name}" does not implement the execute() method.`
		);
	}

	buildSlashData() {
		if (!this.slash) return null;
		if (typeof this.slash === "object" && typeof this.slash.toJSON === "function") {
			return this.slash;
		}

		return new SlashCommandBuilder()
			.setName(this.name)
			.setDescription(this.description);
	}

	buildContextChatData() {
		if (!this.contextChat) return null;
		return new ContextMenuCommandBuilder()
			.setName(this.contextChat)
			.setType(ApplicationCommandType.Message);
	}

	buildContextUserData() {
		if (!this.contextUser) return null;
		return new ContextMenuCommandBuilder()
			.setName(this.contextUser)
			.setType(ApplicationCommandType.User);
	}

	getUsageString(prefix) {
		if (!this.usage) return `${prefix}${this.name}`;
		return `${prefix}${this.name} ${this.usage}`;
	}
}

export default BaseCommand;
