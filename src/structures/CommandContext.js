/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CommandContext — Unified Command Context Wrapper
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Normalizes the API surface between Discord.js Message objects and
 * Interaction objects (ChatInputCommandInteraction, ContextMenuCommandInteraction).
 *
 * This allows command execute() methods to work identically regardless of
 * whether the command was triggered by a prefix message or a slash command.
 *
 * Key Properties:
 *   - context.isInteraction / context.isMessage  — Type discrimination
 *   - context.author       — The user who triggered the command
 *   - context.member       — The GuildMember who triggered the command
 *   - context.guild        — The guild (null in DMs)
 *   - context.channel      — The channel where the command was used
 *   - context.args         — Parsed arguments (string[] for messages, Interaction options for slash)
 *   - context.raw          — The raw Message or Interaction object
 *
 * Key Methods:
 *   - context.reply(options)      — Responds to the user
 *   - context.editReply(options)  — Edits a previous response
 *   - context.defer()             — Defers the reply (interactions only)
 *   - context.followUp(options)   — Sends a follow-up message
 *
 * Usage:
 *   // Inside a command's execute():
 *   async execute(ctx) {
 *     await ctx.reply({ content: `Hello, ${ctx.author.username}!` });
 *   }
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class CommandContext {
	/**
	 * Creates a new CommandContext.
	 *
	 * @param {Object} options - Context options
	 * @param {import('discord.js').Message|import('discord.js').Interaction} options.source - The raw source object
	 * @param {string[]} [options.args=[]] - Parsed arguments (for prefix commands)
	 * @param {string} [options.prefix="!"] - The prefix used (for prefix commands)
	 */
	constructor({ source, args = [], prefix = "!" }) {
		/** @type {import('discord.js').Message|import('discord.js').Interaction} Raw source object */
		this.raw = source;

		/** @type {boolean} Whether the source is an Interaction */
		this.isInteraction = !source.content && source.commandName !== undefined;

		/** @type {boolean} Whether the source is a Message */
		this.isMessage = !this.isInteraction;

		/** @type {import('discord.js').User} The user who triggered the command */
		this.author = this.isMessage ? source.author : source.user;

		/** @type {import('discord.js').GuildMember|null} The guild member */
		this.member = source.member ?? null;

		/** @type {import('discord.js').Guild|null} The guild (null in DMs) */
		this.guild = source.guild ?? null;

		/** @type {import('discord.js').TextBasedChannel} The source channel */
		this.channel = source.channel;

		/** @type {import('discord.js').Client} The client instance */
		this.client = source.client;

		/** @type {number} Timestamp when the command context was created */
		this.createdTimestamp = source.createdTimestamp ?? Date.now();

		/** @type {string} The prefix used to invoke the command */
		this.prefix = prefix;

		/**
		 * @type {string[]|import('discord.js').CommandInteractionOptionResolver}
		 * For prefix commands: array of string arguments split from the message.
		 * For slash commands: the interaction's options resolver.
		 */
		this.args = this.isInteraction ? source.options : args;

		/**
		 * @type {import('discord.js').Message|null}
		 * Stores the reply message for prefix commands so editReply() can work.
		 * @private
		 */
		this._replyMessage = null;

		/**
		 * @type {boolean}
		 * Tracks whether a reply has been sent (for interactions, deferred counts too).
		 * @private
		 */
		this._replied = false;
	}

	// ─── Response Methods ────────────────────────────────────────────────────

	/**
	 * Replies to the command invocation.
	 *
	 * For Messages:      Sends a reply to the message.
	 * For Interactions:  Calls interaction.reply().
	 *
	 * @param {string|import('discord.js').MessagePayload|import('discord.js').InteractionReplyOptions} options
	 * @returns {Promise<import('discord.js').Message|import('discord.js').InteractionResponse>}
	 */
	async reply(options) {
		this._replied = true;

		if (this.isMessage) {
			// Normalize string to options object for consistency
			const payload = typeof options === "string" ? { content: options } : options;
			this._replyMessage = await this.raw.reply(payload);
			return this._replyMessage;
		}

		return this.raw.reply(options);
	}

	/**
	 * Edits a previous reply.
	 *
	 * For Messages:      Edits the stored reply message.
	 * For Interactions:  Calls interaction.editReply().
	 *
	 * @param {string|import('discord.js').MessagePayload|import('discord.js').InteractionEditReplyOptions} options
	 * @returns {Promise<import('discord.js').Message>}
	 */
	async editReply(options) {
		if (this.isMessage) {
			if (!this._replyMessage) {
				throw new Error(
					"Cannot edit reply: no reply has been sent yet. Call reply() first."
				);
			}
			const payload = typeof options === "string" ? { content: options } : options;
			return this._replyMessage.edit(payload);
		}

		return this.raw.editReply(options);
	}

	/**
	 * Defers the reply (shows "Bot is thinking..." for interactions).
	 *
	 * For Messages:      No-op (returns immediately).
	 * For Interactions:  Calls interaction.deferReply().
	 *
	 * @param {Object} [options={}] - Defer options
	 * @param {boolean} [options.ephemeral=false] - Whether the deferred reply is ephemeral
	 * @returns {Promise<void>}
	 */
	async defer(options = {}) {
		this._replied = true;

		if (this.isMessage) {
			// For prefix commands, we can optionally show a typing indicator
			await this.raw.channel.sendTyping();
			return;
		}

		return this.raw.deferReply(options);
	}

	/**
	 * Sends a follow-up message.
	 *
	 * For Messages:      Sends a new message in the same channel.
	 * For Interactions:  Calls interaction.followUp().
	 *
	 * @param {string|import('discord.js').MessagePayload|import('discord.js').InteractionReplyOptions} options
	 * @returns {Promise<import('discord.js').Message>}
	 */
	async followUp(options) {
		if (this.isMessage) {
			const payload = typeof options === "string" ? { content: options } : options;
			return this.channel.send(payload);
		}

		return this.raw.followUp(options);
	}

	// ─── Utility Methods ─────────────────────────────────────────────────────

	/**
	 * Gets a string option value. Works for both prefix args and slash options.
	 *
	 * @param {string|number} nameOrIndex - Option name (slash) or argument index (prefix)
	 * @param {boolean} [required=false] - Whether the option is required
	 * @returns {string|null}
	 */
	getOption(nameOrIndex, required = false) {
		if (this.isInteraction) {
			return this.raw.options.getString(nameOrIndex, required);
		}

		// For prefix commands, treat nameOrIndex as an array index
		const index = typeof nameOrIndex === "number" ? nameOrIndex : 0;
		return this.args[index] ?? null;
	}

	/**
	 * Gets the remaining arguments as a joined string (prefix commands only).
	 * For interactions, returns the first string option value.
	 *
	 * @param {number} [startIndex=0] - Starting index in the args array
	 * @returns {string}
	 */
	getFullArgs(startIndex = 0) {
		if (this.isInteraction) {
			// Return the first string option for interactions
			const options = this.raw.options.data;
			if (options.length > 0) return options[0].value?.toString() ?? "";
			return "";
		}

		return this.args.slice(startIndex).join(" ");
	}

	/**
	 * Whether this command was used in a guild (not a DM).
	 * @returns {boolean}
	 */
	get inGuild() {
		return this.guild !== null;
	}
}

module.exports = CommandContext;
