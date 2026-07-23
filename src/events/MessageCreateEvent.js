import BaseEvent from "../structures/BaseEvent.js";
import CommandContext from "../structures/CommandContext.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MessageCreateEvent — Prefix Command Handler
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class MessageCreateEvent extends BaseEvent {
	constructor() {
		super({ name: "messageCreate", once: false });
	}

	/**
	 * @param {import('discord.js').Message} message
	 * @param {import('../structures/BotClient')} client
	 */
	async execute(message, client) {
		if (message.author.bot || message.webhookId || message.system) return;

		const prefix = client.config.prefix;
		if (!message.content.startsWith(prefix)) return;

		const args = message.content.slice(prefix.length).trim().split(/\s+/);
		const commandName = args.shift()?.toLowerCase();
		if (!commandName) return;

		const command = client.commandManager.resolveCommand(commandName);
		if (!command) return;

		const context = new CommandContext({ source: message, args, prefix });
		await client.commandManager.executeCommand(command, context);
	}
}

export default MessageCreateEvent;
