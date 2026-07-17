const { EmbedBuilder, MessageFlags } = require("discord.js");
const ConfigManager = require("../config/ConfigManager.js");

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EmbedManager — Standardized Response Builder & Sender
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Provides a uniform, config-driven response system for the bot. All emoji
 * strings and color codes are loaded dynamically from config.jsonc — nothing
 * is hardcoded inside this class.
 *
 * Response Types:
 *   - success   → Green embed with success emoji
 *   - error     → Red embed with error emoji
 *   - warning   → Yellow embed with warning emoji
 *   - info      → Blue/primary embed with info emoji
 *   - loading   → Primary embed with loading emoji
 *
 * Key Methods:
 *   - send(channel, type, description, options)   → Sends to a TextChannel
 *   - reply(source, type, description, options)   → Replies to Message or Interaction
 *   - sendTimeoutWarning(source, seconds, options)→ Sends an auto-deleting timeout warning
 *
 * All methods support:
 *   - deleteAfter (number)  — Auto-deletes the message after N milliseconds
 *   - ephemeral (boolean)   — Ephemeral flag for interactions
 *   - title (string)        — Optional embed title override
 *   - footer (string)       — Optional embed footer text
 *   - fields (array)        — Optional embed fields
 *   - thumbnail (string)    — Optional thumbnail URL
 *   - timestamp (boolean)   — Whether to add a timestamp
 *
 * Usage:
 *   const embed = new EmbedManager();
 *   await embed.reply(interaction, "success", "User banned successfully!");
 *   await embed.send(channel, "error", "Something went wrong.", { deleteAfter: 5000 });
 *   await embed.sendTimeoutWarning(interaction, 30);
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class EmbedManager {
	constructor() {
		/** @type {ConfigManager} */
		this._config = ConfigManager.getInstance();
	}

	// ─── Config Accessors ────────────────────────────────────────────────────
	// All visual tokens (colors, emojis) are read from config.jsonc at call time
	// so that hot-reloading the config is possible without restarting.

	/**
	 * Retrieves the embed color map from config.
	 * Falls back to Discord brand colors if not configured.
	 *
	 * @returns {Object} Color map keyed by type (PRIMARY, SUCCESS, WARNING, ERROR)
	 * @private
	 */
	_getColors() {
		return this._config.get("EMBED_COLORS", {
			PRIMARY: "#5865F2",
			SUCCESS: "#57F287",
			WARNING: "#FEE75C",
			ERROR: "#ED4245",
		});
	}

	/**
	 * Retrieves the emoji map from config.
	 * Falls back to Unicode emojis if not configured.
	 *
	 * @returns {Object} Emoji map keyed by type (SUCCESS, ERROR, WARNING, INFO, LOADING)
	 * @private
	 */
	_getEmojis() {
		return this._config.get("EMBED_EMOJIS", {
			SUCCESS: "✅",
			ERROR: "❌",
			WARNING: "⚠️",
			INFO: "ℹ️",
			LOADING: "⏳",
		});
	}

	/**
	 * Maps a response type string to its corresponding color and emoji
	 * from the config.
	 *
	 * @param {string} type - One of: "success", "error", "warning", "info", "loading"
	 * @returns {{ color: string, emoji: string }}
	 * @private
	 */
	_resolveType(type) {
		const colors = this._getColors();
		const emojis = this._getEmojis();

		const typeMap = {
			success: { color: colors.SUCCESS, emoji: emojis.SUCCESS },
			error: { color: colors.ERROR, emoji: emojis.ERROR },
			warning: { color: colors.WARNING, emoji: emojis.WARNING },
			info: { color: colors.PRIMARY, emoji: emojis.INFO },
			loading: { color: colors.PRIMARY, emoji: emojis.LOADING },
		};

		const resolved = typeMap[type.toLowerCase()];

		if (!resolved) {
			throw new Error(
				`EmbedManager: Unknown response type "${type}". ` +
				`Valid types: ${Object.keys(typeMap).join(", ")}`
			);
		}

		return resolved;
	}

	/**
	 * Builds an EmbedBuilder from the given type and options.
	 * This is the internal factory used by send() and reply().
	 *
	 * @param {string} type - Response type (success, error, warning, info, loading)
	 * @param {string} description - The embed description body
	 * @param {Object} [options={}] - Additional embed options
	 * @param {string} [options.title] - Optional embed title
	 * @param {string} [options.footer] - Optional footer text
	 * @param {Array} [options.fields] - Optional embed fields
	 * @param {string} [options.thumbnail] - Optional thumbnail URL
	 * @param {boolean} [options.timestamp=false] - Whether to add a timestamp
	 * @returns {EmbedBuilder}
	 */
	buildEmbed(type, description, options = {}) {
		const { color, emoji } = this._resolveType(type);

		const embed = new EmbedBuilder()
			.setDescription(`${emoji} ${description}`)
			.setColor(color);

		if (options.title) {
			embed.setTitle(options.title);
		}

		if (options.footer) {
			embed.setFooter({ text: options.footer });
		}

		if (options.fields && Array.isArray(options.fields)) {
			embed.addFields(options.fields);
		}

		if (options.thumbnail) {
			embed.setThumbnail(options.thumbnail);
		}

		if (options.timestamp) {
			embed.setTimestamp();
		}

		return embed;
	}

	// ─── Core Response Methods ───────────────────────────────────────────────

	/**
	 * Sends an embed to a TextChannel.
	 *
	 * @param {import('discord.js').TextBasedChannel} channel - The target channel
	 * @param {string} type - Response type (success, error, warning, info, loading)
	 * @param {string} description - The message body
	 * @param {Object} [options={}] - Additional options
	 * @param {number} [options.deleteAfter] - Auto-delete after N milliseconds
	 * @param {string} [options.title] - Embed title
	 * @param {string} [options.footer] - Embed footer
	 * @param {Array} [options.fields] - Embed fields
	 * @param {string} [options.thumbnail] - Thumbnail URL
	 * @param {boolean} [options.timestamp] - Add timestamp
	 * @returns {Promise<import('discord.js').Message>} The sent message
	 */
	async send(channel, type, description, options = {}) {
		const embed = this.buildEmbed(type, description, options);

		const payload = { embeds: [embed] };
		if (options.components) payload.components = options.components;
		if (options.content) payload.content = options.content;

		const message = await channel.send(payload);

		// ── Auto-delete after specified duration ────────────────────────────
		if (options.deleteAfter && options.deleteAfter > 0) {
			setTimeout(() => {
				message.delete().catch(() => {});
			}, options.deleteAfter);
		}

		return message;
	}

	/**
	 * Replies to a Message or Interaction with a typed embed.
	 *
	 * Seamlessly handles both:
	 *   - discord.js Message objects (calls message.reply())
	 *   - Interaction objects (calls interaction.reply() or followUp() if already replied)
	 *
	 * @param {import('discord.js').Message|import('discord.js').Interaction} source - Message or Interaction
	 * @param {string} type - Response type (success, error, warning, info, loading)
	 * @param {string} description - The message body
	 * @param {Object} [options={}] - Additional options
	 * @param {number} [options.deleteAfter] - Auto-delete after N milliseconds
	 * @param {boolean} [options.ephemeral=false] - Whether the reply is ephemeral (interactions only)
	 * @param {string} [options.title] - Embed title
	 * @param {string} [options.footer] - Embed footer
	 * @param {Array} [options.fields] - Embed fields
	 * @param {string} [options.thumbnail] - Thumbnail URL
	 * @param {boolean} [options.timestamp] - Add timestamp
	 * @returns {Promise<import('discord.js').Message|import('discord.js').InteractionResponse>}
	 */
	async reply(source, type, description, options = {}) {
		const embed = this.buildEmbed(type, description, options);

		let sentMessage;

		// ── Determine if the source is an Interaction or a Message ─────────
		const isInteraction = source.commandName !== undefined || source.customId !== undefined;

		if (isInteraction) {
			const payload = { embeds: [embed] };
			if (options.components) payload.components = options.components;
			if (options.content) payload.content = options.content;

			// Apply ephemeral flag if requested
			if (options.ephemeral) {
				payload.flags = MessageFlags.Ephemeral;
			}

			// Handle already-replied or deferred interactions
			if (source.replied || source.deferred) {
				sentMessage = await source.followUp(payload);
			} else {
				sentMessage = await source.reply(payload);
			}
		} else {
			// Standard Message reply
			const payload = { embeds: [embed] };
			if (options.components) payload.components = options.components;
			if (options.content) payload.content = options.content;

			sentMessage = await source.reply(payload);
		}

		// ── Auto-delete after specified duration ────────────────────────────
		// Note: Ephemeral messages cannot be deleted by the bot, so skip
		if (options.deleteAfter && options.deleteAfter > 0 && !options.ephemeral) {
			setTimeout(() => {
				// For interactions, fetch the reply message to delete it
				if (isInteraction) {
					source.deleteReply().catch(() => {});
				} else if (sentMessage?.deletable) {
					sentMessage.delete().catch(() => {});
				}
			}, options.deleteAfter);
		}

		return sentMessage;
	}

	/**
	 * Sends a timeout warning that auto-deletes itself.
	 *
	 * Useful for indicating that a command or process will time out
	 * after a specified number of seconds.
	 *
	 * @param {import('discord.js').Message|import('discord.js').Interaction} source - Message or Interaction
	 * @param {number} seconds - Number of seconds until timeout
	 * @param {Object} [options={}] - Additional options
	 * @param {string} [options.message] - Custom message override
	 * @param {boolean} [options.ephemeral=true] - Whether the warning is ephemeral
	 * @returns {Promise<import('discord.js').Message|import('discord.js').InteractionResponse>}
	 */
	async sendTimeoutWarning(source, seconds, options = {}) {
		const emojis = this._getEmojis();
		const defaultMessage =
			`This action will expire in **${seconds}** second(s). ` +
			"Please respond before it times out.";

		return this.reply(source, "warning", options.message ?? defaultMessage, {
			title: `${emojis.WARNING} Timeout Warning`,
			ephemeral: options.ephemeral ?? true,
			// Auto-delete the warning after the timeout duration
			deleteAfter: seconds * 1_000,
			...options,
		});
	}

	// ─── CommandContext Integration ───────────────────────────────────────────

	/**
	 * Replies to a CommandContext with a typed embed.
	 * This is a convenience method for use inside command execute() methods.
	 *
	 * @param {import('./CommandContext')} ctx - The unified command context
	 * @param {string} type - Response type (success, error, warning, info, loading)
	 * @param {string} description - The message body
	 * @param {Object} [options={}] - Additional options
	 * @returns {Promise<import('discord.js').Message|import('discord.js').InteractionResponse>}
	 */
	async replyToContext(ctx, type, description, options = {}) {
		return this.reply(ctx.raw, type, description, options);
	}
}

module.exports = EmbedManager;
