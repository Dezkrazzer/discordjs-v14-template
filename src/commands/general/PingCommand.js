import BaseCommand from "../../structures/BaseCommand.js";
import Discord from "discord.js";

class PingCommand extends BaseCommand {
	constructor(client) {
		super(client, {
			name: "ping",
			description: "Check the bot's websocket latency.",
			aliases: ["latency", "pong"],
			cooldown: 5,
			devOnly: false,
			usage: "",
			slash: new Discord.SlashCommandBuilder()
				.setName("ping")
				.setDescription("Check the bot's websocket latency."),
			category: "General",
		});
	}

	/**
	 * @param {import('../../structures/CommandContext.js')} ctx
	 */
	async execute(ctx) {
		const m = await ctx.client.embedManager.replyToContext(
			ctx,
			"LOADING",
			"Please wait... we're pinging the bot's websocket latency."
		);

		const latency = m.createdTimestamp - ctx.createdTimestamp;
		const ws = ctx.client.ws.ping;

		const embed = new Discord.EmbedBuilder()
			.setColor(ctx.client.config.embedColors.INFO)
			.addFields(
				{
					name: "🛜 Latency",
					value: `**\`${latency} ms\`**`,
					inline: true
				},
				{
					name: "📶 WebSocket",
					value: `**\`${ws} ms\`**`,
					inline: true
				}
			)
			.setFooter({
				text: `${ctx.client.user.tag} Ping`,
				iconURL: ctx.client.user.avatarURL({ size: 4096 }),
			})
			.setTimestamp();

		setTimeout(() => {
			m.edit({ embeds: [embed] });
		}, 2000);

	}
}

export default PingCommand;
