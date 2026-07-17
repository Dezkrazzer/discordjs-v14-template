const BaseCommand = require("../../structures/BaseCommand.js");
const Discord = require("discord.js");
const cpuStat = require("cpu-stat");
const momentTz = require("moment-timezone");
const os = require("os");
require("moment-duration-format");

class StatsCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: "stats",
            description: "View the bot's live statistics.",
            aliases: ["st"],
            cooldown: 5,
            devOnly: false,
            usage: "",
            slash: new Discord.SlashCommandBuilder()
                .setName("stats")
                .setDescription("View the bot's live statistics."),
            contextChat: null,
            contextUser: null,
            disable: false,
            category: "General"
        });
    }

    /**
     * @param {import('../structures/CommandContext')} ctx - Unified command context
     */
    async execute(ctx) {
        generateEmbed(ctx).then(embed => {
            embed.setFooter({
                text: `Requested by ${ctx.author.tag}`,
                iconURL: ctx.author.avatarURL({
                    size: 4096,
                    dynamic: true
                })
            });
            ctx.reply({
                embeds: [embed]
            })
        })
    }
}

function convertMS(ms) {
    let d, h, m, s;
    s = Math.floor(ms / 1000);
    m = Math.floor(s / 60);
    s = s % 60;
    h = Math.floor(m / 60);
    m = m % 60;
    d = Math.floor(h / 24);
    h = h % 24;
    return { d, h, m, s };
}

async function generateEmbed(ctx) {
    return new Promise((resolve => {
        cpuStat.usagePercent((err, percent) => {
            if (err) {
                ctx.client.logger.error("Error while fetching CPU usage:", err);
                return resolve(null);
            }

            const uptime = convertMS(ctx.client.uptime);
            const osUptime = convertMS(os.uptime() * 1000);
            const latency = Date.now() - ctx.createdTimestamp;
            const websocket = ctx.client.ws.ping;
            const totalBotsLogin = getTotalBotsLogin(ctx.client);

            const embed = new Discord.EmbedBuilder()
                .setColor(ctx.client.config.embedColors.PRIMARY)
                .setAuthor({
                    name: `${ctx.client.user.username} Statistics`,
                    iconURL: ctx.client.user.avatarURL({ size: 4096 })
                })
                .addFields(
                    {
                        name: "Connected to:",
                        value: [
                            "```asciidoc",
                            `• Guilds :: ${ctx.client.guilds.cache.size}`,
                            `• Channels :: ${ctx.client.channels.cache.size.toLocaleString()}`,
                            `• Users :: ${ctx.client.users.cache.size.toLocaleString()}`,
                            `• Shards :: ${ctx.client.shard?.count || "INACTIVE"}`,
                            `• Multibot :: ${totalBotsLogin}`,
                            "```",
                        ].join("\n"),
                        inline: false
                    },
                    {
                        name: "System:",
                        value: [
                            "```asciidoc",
                            `• Langs :: Node.js ${process.version}`,
                            `• Libs :: Discord.js v${require("discord.js").version}`,
                            "```",
                        ].join("\n"),
                        inline: false
                    },
                    {
                        name: "Usage:",
                        value: [
                            "```asciidoc",
                            `• CPU :: ${percent.toFixed(2)}%`,
                            `• Memory :: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} / ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB`,
                            `• Bot ready at :: ${momentTz.tz(ctx.client.readyAt, ctx.client.config.defaultTimezone).format(ctx.client.config.defaultTimezoneFormat)}`,
                            `• Bot Uptime :: Booted up ${uptime.d}d ${uptime.h}h ${uptime.m}m ${uptime.s}s`,
                            `• OS Uptime :: Booted up ${osUptime.d}d ${osUptime.h}h ${osUptime.m}m ${osUptime.s}s`,
                            "```",
                        ].join("\n"),
                        inline: false
                    },
                    {
                        name: "CPU:",
                        value: `\`\`\`md\n${os.cpus().length}x ${os.cpus()[0].model}\n\`\`\``,
                    },
                    {
                        name: "Other:",
                        value: [
                            "```asciidoc",
                            `• Arch :: ${os.arch()}`,
                            `• Platform :: ${os.platform()}`,
                            `• Latency :: ${latency.toLocaleString()} ms`,
                            `• Websockets :: ${websocket.toLocaleString()} ms`,
                            "```",
                        ].join("\n"),
                        inline: false
                    }
                )
                .setTimestamp();

            resolve(embed);
        })
    }))
}

function getTotalBotsLogin(client) {
    const manager = client.multiBotManager;

    if (!manager?.clients) {
        return client.isReady() || client.user ? 1 : 0;
    }

    let total = 0;

    for (const bot of manager.clients.values()) {
        if (bot?.isReady?.() || bot?.readyAt) {
            total++;
        }
    }

    return total;
}

module.exports = StatsCommand;
