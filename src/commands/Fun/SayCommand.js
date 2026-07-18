const BaseCommand = require("../../structures/BaseCommand.js");

class SayCommand extends BaseCommand {
    constructor(client) {
        super(client, {
            name: "say",
            description: "Make the bot say something.",
            aliases: [],
            cooldown: 5,
            devOnly: false,
            usage: "<message>",
            slash: false,
            contextChat: null,
            contextUser: null,
            disable: false,
            category: "Fun"
        });
    }

    /**
     * @param {import('../../structures/CommandContext')} ctx 
     */
    async execute(ctx) {
        const message = ctx.args.join(" ");
        if (!message) {
            return ctx.client.embedManager.replyToContext(
                ctx,
                "error",
                "You need to provide a message for the bot to say.",
                { deleteAfter: 5000 }
            )
        }

        if (ctx.isMessage) {
            ctx.raw.delete().catch(() => {});
        }

        await ctx.followUp({
            content: message
        });
    }
}

module.exports = SayCommand;
