const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('start')
		.setDescription('create message to edit'),
	async execute(interaction) {
		await interaction.reply(`Copy the message ID of this & put in config.json`);
	},
};