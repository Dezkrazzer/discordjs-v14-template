const BaseCommand = require("../../structures/BaseCommand.js");

class PingCommand extends BaseCommand {
	constructor(client) {
		super(client, {
			name: "ping",
			description: "Check the bot's websocket latency.",
			aliases: ["latency", "pong"],
			cooldown: 5,
			devOnly: false,
			usage: "",
			slash: true,
			category: "General",
		});
	}

	/**
	 * @param {import('../../structures/CommandContext.js')} ctx
	 */
	async execute(ctx) {
		const ping = ctx.client.ws.ping;
		const description = `My current websocket latency is **${ping}ms**.`;

		await ctx.client.embedManager.replyToContext(ctx, "info", description, {
			title: "🏓 Pong!",
		});
	}
}

module.exports = PingCommand;
