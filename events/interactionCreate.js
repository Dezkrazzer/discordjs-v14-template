module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command || !command.execute) return;

        try {
            client.logger.log(`> ID : ${interaction.user.id} | User : ${interaction.user.tag} | slash | ${command.name}`, "info");
            await command.execute(interaction, client);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Error executing command', ephemeral: true });
        }
    }
};