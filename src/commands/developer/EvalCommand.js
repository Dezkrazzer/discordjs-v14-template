import axios from "axios";
import util from "util";
import Discord from "discord.js";
import BaseCommand from "../../structures/BaseCommand.js";

function clean(text) {
	if (typeof text === "string")
		return text
			.replace(/`/g, `\`${String.fromCharCode(8203)}`)
			.replace(/@/g, `@${String.fromCharCode(8203)}`);
	else return text;
}

class EvalCommand extends BaseCommand {
	constructor(client) {
		super(client, {
			name: "eval",
			aliases: ["ev", "e"],
			description: "evaluation you code.",
			category: "Developer",
			devOnly: true,
			slash: false,
		});
	}

	async execute(ctx) {
		const client = ctx.client;
		// Remove if statement if you want to allow eval on all bots in multi-bot setup
		if (client.multiBotManager && client.label !== client.multiBotManager.primaryLabel) {
			return;
		}
		// biome-ignore lint/correctness/noUnusedVariables: Available for eval scope
		const msg = ctx.raw;
		// biome-ignore lint/correctness/noUnusedVariables: Available for eval scope
		const message = ctx.raw;
		const bot = ctx.client;
		let code = ctx.isMessage ? ctx.args.join(" ") : ctx.getFullArgs();

		try {
			if (!code) {
				return await client.embedManager.replyToContext(
					ctx,
					"WARNING",
					"What is your **JavaScript Code**?",
					{ deleteAfter: 5000 }
				);
			}

			let evaled;

			if (code.includes("--silent") && code.includes("--async")) {
				code = code.replace("--async", "").replace("--silent", "");
				return await eval(`(async () => { ${code} })()`);
			} else if (code.includes("--async")) {
				code = code.replace("--async", "");
				evaled = await eval(`(async () => { ${code} })()`);
			} else if (code.includes("--silent")) {
				code = code.replace("--silent", "");
				return await eval(code);
			} else {
				evaled = await eval(code);
			}

			if (typeof evaled !== "string") evaled = util.inspect(evaled, { depth: 0 });

			let output = clean(evaled);

			output = output.replace(new RegExp(client.token, "g"), "[TOKEN]");
			output = output.replace(new RegExp(bot.token, "g"), "[TOKEN]");

			if (output.length > 1024) {
				const hastebinUrl = client.config.get("HASTEBIN_URL") || "https://bin.acronet.work";

				const { data } = await axios.post(`${hastebinUrl}/documents`, output);
				await client.embedManager.replyToContext(ctx, "YES", "Code evaluated successfully! Output is too long to display here.", {
					components: [
						{
							type: 1,
							components: [
								{
									type: 2,
									label: "View Result",
									url: `${hastebinUrl}/${data.key}.js`,
									style: 5,
								},
							],
						},
					],
				});
			} else {
				const embed = new Discord.EmbedBuilder()
					.setTitle("Output")
					.setDescription(`\`\`\`js\n${output}\n\`\`\``)
					.setColor(ctx.client.config.embedColors.YES)
					.setFooter({
						text: `Requested by ${ctx.author.username}`,
						iconURL: ctx.author.displayAvatarURL({ size: 4096, dynamic: true }),
					})
					.setTimestamp();
				await ctx.followUp({ embeds: [embed] });
			}
		} catch (e) {
			const error = clean(e);
			const embed = new Discord.EmbedBuilder()
					.setTitle("Error")
					.setDescription(`\`\`\`js\n${error}\n\`\`\``)
					.setColor(ctx.client.config.embedColors.ERROR)
					.setFooter({
						text: `Requested by ${ctx.author.username}`,
						iconURL: ctx.author.displayAvatarURL({ size: 4096, dynamic: true }),
					})
					.setTimestamp();
			await ctx.followUp({ embeds: [embed] });
		}
	}
}

export default EvalCommand;