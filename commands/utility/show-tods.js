const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const moment = require('moment-timezone');
const fs = require('fs').promises; // Use promises version of fs
const path = './tods.json';
const { roleName } = require('../../config.json');

const data = new SlashCommandBuilder()
	.setName('show-tods')
	.setDescription('Post tods in chronological order');

module.exports = {
	data,
	async execute(interaction) {
		try {
			const result = await getMonsterData();
			await interaction.reply({content: result, ephemeral: true});
		} catch (err) {
			console.error("Error:", err);
		}
	},
};

async function getMonsterData() {
    try {
        // Read the existing JSON file
        const data = await fs.readFile(path, 'utf8');
        const monsters = JSON.parse(data);

        // Get the current time
        const now = moment();

        // Sort monsters based on respawnTimeMinEpoch
        monsters.sort((a, b) => {
            // Calculate time differences
            const respawnA = a.respawnTimeMaxEpoch ? moment.unix(a.respawnTimeMaxEpoch) : moment.unix(a.respawnTimeMinEpoch);
            const respawnB = b.respawnTimeMaxEpoch ? moment.unix(b.respawnTimeMaxEpoch) : moment.unix(b.respawnTimeMinEpoch);

            // Compare respawn times
            return respawnA.isBefore(now) - respawnB.isBefore(now) || respawnA.diff(respawnB);
        });

        // String to collect all formatted outputs
        let allFormattedOutput = '';

        // Iterate over each monster and display the formatted information
        monsters.forEach(monster => {
            let monsterName = monster.displayText || monster.name;
            if (monster.lastDeathDay) {
                const displayDeathDay = monster.lastDeathDay ? ` Day ${monster.lastDeathDay + 1} ` : "";
                monsterName = insertBeforeLastChar(monsterName, displayDeathDay);
            }

            // Check if respawnTimeMax is in the past
            let formattedOutput = `${monsterName}\n`;
            let todNeedsUpdated = monster.respawnTimeMaxEpoch && (moment().unix() > monster.respawnTimeMaxEpoch);

            // for force pops like shikishima weapon
            if (!monster.respawnTimeMaxEpoch && (moment().unix() > monster.respawnTimeMinEpoch)) {
                todNeedsUpdated = true;
            }

            if (todNeedsUpdated) {
                formattedOutput += `> ~~<t:${monster.respawnTimeMinEpoch}:T> - <t:${monster.respawnTimeMinEpoch}:R>~~`;
            } else {
                formattedOutput += `> <t:${monster.respawnTimeMinEpoch}:T> - <t:${monster.respawnTimeMinEpoch}:R>`;
            }

            if (monster.respawnTimeMin === 302416) {
                formattedOutput += ` force <t:${monster.respawnTimeMaxEpoch}:R>`;
            }

            // Add the formatted output to the string
            allFormattedOutput += formattedOutput + '\n\n'; // Add extra newline for spacing
        });

        // Resolve with the collected formatted output
        return allFormattedOutput;
    } catch (err) {
        console.error("Error:", err);
        throw err; // Rethrow the error for the caller to handle
    }
}

function insertBeforeLastChar(originalString, stringToInsert) {
    let characters = Array.from(originalString); // Convert to an array of characters to keep emojis 
    return characters.slice(0, -1).join('') + stringToInsert + characters.slice(-1).join('');
}
