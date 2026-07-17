const fs = require("node:fs");
const path = require("node:path");
const { Collection } = require("discord.js");
const BaseCommand = require("./BaseCommand.js");

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CommandManager — Command Loader, Registry, and Execution Router
 * ═══════════════════════════════════════════════════════════════════════════════
 */
class CommandManager {
	/**
	 * @param {import('./BotClient')} client
	 */
	constructor(client) {
		this.client = client;
		this.cooldowns = new Collection();
	}

	async loadAll() {
		const commandsDir = path.join(__dirname, "..", "commands");

		if (!fs.existsSync(commandsDir)) {
			this.client.logger.warn(`> ⚠️ • Commands directory not found at: ${commandsDir}`);
			return;
		}

		const categories = fs.readdirSync(commandsDir, { withFileTypes: true })
			.filter((dirent) => dirent.isDirectory())
			.map((dirent) => dirent.name);

		let loadedCount = 0;
		let skippedCount = 0;

		for (const category of categories) {
			const categoryPath = path.join(commandsDir, category);
			const files = fs.readdirSync(categoryPath).filter((file) => file.endsWith(".js"));

			for (const file of files) {
				try {
					const filePath = path.join(categoryPath, file);
					const CommandClass = require(filePath);

					if (typeof CommandClass !== "function") {
						this.client.logger.warn(`> ⚠️ • Skipping "${file}": export is not a class`);
						skippedCount++;
						continue;
					}

					const command = new CommandClass(this.client);

					if (!(command instanceof BaseCommand)) {
						this.client.logger.warn(`> ⚠️ • Skipping "${file}": does not extend BaseCommand`);
						skippedCount++;
						continue;
					}

					if (command.disable) {
						skippedCount++;
						continue;
					}

					command.category = category;

					this.client.commands.set(command.name, command);

					if (command.aliases && command.aliases.length > 0) {
						for (const alias of command.aliases) {
							this.client.aliases.set(alias.toLowerCase(), command.name);
						}
					}

					loadedCount++;
				} catch (error) {
					this.client.logger.error(`> ❌ • Failed to load command from "${category}/${file}": ${error.message}`);
				}
			}
		}

		this.client.logger.success(`> ✅ • Loaded ${loadedCount} command(s) (${skippedCount} skipped)`);
	}

	async registerSlashCommands() {
		const config = this.client.config;

		if (!config.slashEnabled) return;

		const { REST, Routes } = require("discord.js");
		const slashData = [];

		for (const [, command] of this.client.commands) {
			const slash = command.buildSlashData();
			if (slash) {
				slashData.push(typeof slash.toJSON === "function" ? slash.toJSON() : slash);
			}

			const ctxChat = command.buildContextChatData();
			if (ctxChat) slashData.push(ctxChat.toJSON());

			const ctxUser = command.buildContextUserData();
			if (ctxUser) slashData.push(ctxUser.toJSON());
		}

		if (slashData.length === 0) return;

		const rest = new REST({ version: "10" }).setToken(this.client.token);

		try {
			if (config.isDev && config.devGuildId) {
				await rest.put(
					Routes.applicationGuildCommands(this.client.user.id, config.devGuildId),
					{ body: slashData }
				);
				this.client.logger.success(`> ✅ • Registered ${slashData.length} command(s) to dev guild (${config.devGuildId})`);
			} else {
				await rest.put(
					Routes.applicationCommands(this.client.user.id),
					{ body: slashData }
				);
				this.client.logger.success(`> ✅ • Registered ${slashData.length} command(s) globally`);
			}
		} catch (error) {
			this.client.logger.error(`> ❌ • Failed to register slash commands: ${error.message}`);
		}
	}

	resolveCommand(nameOrAlias) {
		const lower = nameOrAlias.toLowerCase();
		if (this.client.commands.has(lower)) return this.client.commands.get(lower);
		const commandName = this.client.aliases.get(lower);
		if (commandName) return this.client.commands.get(commandName) ?? null;
		return null;
	}

	checkCooldown(userId, command) {
		if (!command.cooldown || command.cooldown <= 0) return 0;

		const key = `${userId}-${command.name}`;
		const now = Date.now();
		const cooldownMs = command.cooldown * 1000;

		if (this.cooldowns.has(key)) {
			const expiresAt = this.cooldowns.get(key);
			if (now < expiresAt) return expiresAt - now;
		}

		this.cooldowns.set(key, now + cooldownMs);
		setTimeout(() => this.cooldowns.delete(key), cooldownMs);

		return 0;
	}

	/**
	 * Centralized command execution logic.
	 * Handles delegation, devOnly checks, cooldowns, and error catching.
	 * Routes all feedback through EmbedManager.
	 *
	 * @param {BaseCommand} command
	 * @param {import('./CommandContext')} context
	 */
	async executeCommand(command, context) {
		// Multi-bot delegation check
		if (
			this.client.multiBotManager &&
			context.guild &&
			!command.devOnly &&
			!this.client.multiBotManager.isDelegatedHandler(this.client, context.guild.id)
		) {
			return;
		}

		// devOnly restriction
		if (command.devOnly) {
			const devIds = this.client.config.devIds;
			if (!devIds.includes(context.author.id)) {
				await this.client.embedManager.replyToContext(
					context,
					"error",
					"This command is restricted to bot developers only.",
					{ ephemeral: true }
				);
				return;
			}
		}

		// Cooldown check
		const remainingMs = this.checkCooldown(context.author.id, command);
		if (remainingMs > 0) {
			const expiryUnix = Math.floor((Date.now() + remainingMs) / 1000);
			await this.client.embedManager.replyToContext(
				context,
				"warning",
				`Please wait! You can use \`${command.name}\` again <t:${expiryUnix}:R>.`,
				{ ephemeral: true, deleteAfter: remainingMs }
			);
			return;
		}

		// Execute command
		try {
			await command.execute(context);
			this.client.logger.cmd(
				`> ${context.author.tag} (${context.author.id}) used "${command.name}" in ${context.guild?.name ?? "DM"} (${context.guild?.id ?? "DM"})`
			);
		} catch (error) {
			this.client.logger.error(
				`> ❌ • Error executing command "${command.name}": ${error.message}`
			);
			if (this.client.config.isDev) this.client.logger.debug(error.stack);

			const errorMsg = this.client.config.isDev
				? `**Error:** \`${error.message}\``
				: "An error occurred while executing this command.";

			try {
				await this.client.embedManager.replyToContext(context, "error", errorMsg, { ephemeral: true });
			} catch {
				// Silently fail if unable to respond
			}
		}
	}
}

module.exports = CommandManager;
