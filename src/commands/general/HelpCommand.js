import fs from "node:fs";
import * as Discord from "discord.js";
import BaseCommand from "../../structures/BaseCommand.js";

class HelpCommand extends BaseCommand {
	constructor(client) {
		super(client, {
			name: "help",
			description:
				"Displays a list of available commands or detailed information about a specific command.",
			aliases: ["h", "commands", "cmd", "?"],
			cooldown: 5,
			devOnly: false,
			usage: "[command]",
			slash: new Discord.SlashCommandBuilder()
				.setName("help")
				.setDescription(
					"Displays a list of available commands or detailed information about a specific command.",
				)
				.addStringOption((option) =>
					option
						.setName("command")
						.setDescription("The specific command to get help for")
						.setRequired(false),
				),
			contextChat: null,
			contextUser: null,
			disable: false,
			category: "General",
		});
	}

	/**
	 * @param {import('../../structures/CommandContext')} ctx
	 */
	async execute(ctx) {
		const targetCommand = ctx.isInteraction
			? ctx.getOption("command")
			: ctx.args[0];

		if (!targetCommand) {
			const categories = fs.readdirSync("./src/commands");

			const embed = new Discord.EmbedBuilder()
				.setColor(ctx.client.config.embedColors.INFO)
				.setAuthor({
					name: `Command List - ${ctx.client.commands.size} Commands`,
					iconURL: ctx.client.user.avatarURL({ size: 4096 }),
				})
				.setThumbnail(
					ctx.guild?.iconURL({
						size: 4096,
						dynamic: true,
					}) || null,
				)
				.setFooter({
					text: `Use ${ctx.prefix}help <command> to get more information.`,
				})
				.setTimestamp();

			for (const category of categories) {
				const commands = ctx.client.commands
					.filter((cmd) => cmd.category === category)
					.map((cmd) => `\`${cmd.name}\``)
					.join(", ");
				if (!commands) continue;
				embed.addFields({
					name: `${category} Commands`,
					value: `> ${commands}`,
					inline: false,
				});
			}
			return ctx.reply({ embeds: [embed] });
		} else {
			const command = ctx.client.commandManager.resolveCommand(targetCommand);
			if (!command) {
				return ctx.client.embedManager.replyToContext(
					ctx,
					"NO",
					`Command \`${targetCommand}\` not found.`,
					{ deleteAfter: 5000 },
				);
			}

			const embed = new Discord.EmbedBuilder()
				.setColor(ctx.client.config.embedColors.INFO)
				.setAuthor({
					name: `Command Help - ${command.name}`,
					iconURL: ctx.client.user.avatarURL({ size: 4096 }),
				})
				.setThumbnail(
					ctx.guild?.iconURL({
						size: 4096,
						dynamic: true,
					}) || null,
				)
				.addFields(
					{ name: "Name", value: `\`${command.name}\``, inline: true },
					{
						name: "Cooldown",
						value: `\`${command.cooldown} sec\``,
						inline: true,
					},
					{
						name: "Dev Only",
						value: `\`${command.devOnly ? "Yes" : "No"}\``,
						inline: true,
					},
					{
						name: "Description",
						value: `> ${command.description}`,
						inline: false,
					},
					{
						name: "Aliases",
						value:
							command.aliases.length > 0
								? `> ${command.aliases.map((alias) => `\`${alias}\``).join(", ")}`
								: "> None",
						inline: false,
					},
					{
						name: "Usage",
						value: `${command.usage ? `\`\`\`${ctx.prefix}${command.name} ${command.usage}\`\`\`` : "No usage information available."}`,
						inline: false,
					},
				)
				.setFooter({
					text: `[] = optional, <> = required | Use ${ctx.prefix}help for list commands.`,
				})
				.setTimestamp();

			return ctx.reply({ embeds: [embed] });
		}
	}
}

export default HelpCommand;
