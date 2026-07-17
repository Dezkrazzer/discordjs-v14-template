const BaseEvent = require("../structures/BaseEvent.js");
const CommandContext = require("../structures/CommandContext.js");

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * InteractionCreateEvent — Slash Command & Context Menu Handler
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class InteractionCreateEvent extends BaseEvent {
	constructor() {
		super({ name: "interactionCreate", once: false });
	}

	/**
	 * @param {import('discord.js').Interaction} interaction
	 * @param {import('../structures/BotClient')} client
	 */
	async execute(interaction, client) {
		if (
			!interaction.isChatInputCommand() &&
			!interaction.isMessageContextMenuCommand() &&
			!interaction.isUserContextMenuCommand()
		) {
			return;
		}

		let command = null;

		if (interaction.isChatInputCommand()) {
			command = client.commandManager.resolveCommand(interaction.commandName);
		} else if (interaction.isMessageContextMenuCommand()) {
			command = client.commands.find((cmd) => cmd.contextChat === interaction.commandName);
		} else if (interaction.isUserContextMenuCommand()) {
			command = client.commands.find((cmd) => cmd.contextUser === interaction.commandName);
		}

		if (!command) {
			try {
				await client.embedManager.reply(
					interaction,
					"error",
					"This command was not found.",
					{ ephemeral: true }
				);
			} catch {
				// Ignore
			}
			return;
		}

		const context = new CommandContext({
			source: interaction,
			prefix: client.config.prefix,
		});

		await client.commandManager.executeCommand(command, context);
	}
}

module.exports = InteractionCreateEvent;
