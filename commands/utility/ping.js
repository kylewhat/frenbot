const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const moment = require('moment-timezone');
const fs = require('fs').promises; // Use promises version of fs
const path = './tods.json';
const rsvpPath = '../var/www/html/timers';
const { channelId, messageId, roleName } = require('../../config.json');

const data = new SlashCommandBuilder()
	.setName('add-tod')
	.setDescription('Add NM tod')
	.addStringOption(option =>
		option.setName('monster')
			.setDescription('The notorious monster')
			.setRequired(true)
			.addChoices(
				{ name: '🐢 Adamantoise 🐢', value: '🐢 Adamantoise 🐢' },
				{ name: '🌭 Behemoth 🌭', value: '🌭 Behemoth 🌭' },
				{ name: '🩸 Bloodsucc 🩸', value: '🩸 Bloodsucc 🩸' },
				{ name: '🐉 Fafnir 🐉', value: '🐉 Fafnir 🐉' },
				{ name: '🧊 Jormzhugand 🧊', value: '🧊 Jormzhugand 🧊' },
				{ name: '🦀 King Crab 🦀', value: '🦀 King Crab 🦀' },
				{ name: '🦂 King Vinegarroon 🦂', value: '🦂 King Vinegarroon 🦂' },
				{ name: '⚔️ Shikigami Weapon ⚔️', value: '⚔️ Shikigami Weapon ⚔️' },
				{ name: '🪶 Simurgh 🪶', value: '🪶 Simurgh 🪶' },
				{ name: '🔥 Tiamat 🔥', value: '🔥 Tiamat 🔥' },
				{ name: '💜 Vrtra 💜', value: '💜 Vrtra 💜' },
	))
	.addStringOption(option =>
		option.setName('tod')
			.setDescription('Time of Death (in central time) formatted like this: 10/17/2024 4:57 PM')
			.setRequired(true)
	)
	.addIntegerOption(option =>
		option.setName('day')
			.setDescription('Days since HQ - If today is day three, enter 3, if HQ king died enter 0')
			.setRequired(false)
			.setMaxValue(18)
			.setMinValue(0)
	);

module.exports = {
	data,
	async execute(interaction, client) {
		const memberHasRole = interaction.member.roles.cache.some(role => role.name === roleName) || interaction.member.roles.cache.some(role => role.name === 'admin');

		if (!memberHasRole) {
			interaction.reply({
				content: 'You don\'t have the power to post tods!!!',
				ephemeral: true
			});
			return;
		}

		const monsterUpdated = interaction.options.getString('monster');
		const todValue = interaction.options.getString('tod');
		let deathDay = interaction.options.getInteger('day');

		if (
			monsterUpdated === '🌭 Behemoth 🌭' ||
			monsterUpdated === '🐉 Fafnir 🐉' ||
			monsterUpdated === '🐢 Adamantoise 🐢'
		) {
			if (deathDay === null || deathDay === undefined) {
				interaction.reply({
					content: `💋 Day number required! Time of death not updated. https://www.youtube.com/watch?v=jVBsM8CM0AE 💋`,
					ephemeral: true
				});
				return;
			}
		} else {
			deathDay = null;
		}

		const isValidTime = moment.tz(todValue, "MM/DD/YYYY hh:mm:ss A", "America/Chicago").isValid();
		if (!isValidTime) {
			interaction.reply({
				content: `🔥 Invalid time! Time of death not updated. Hell, go to it. 🔥`,
				ephemeral: true
			});
			return;
		}

		const tod = moment.tz(todValue, "MM/DD/YYYY hh:mm:ss A", "America/Chicago");
		const deathDayDisplayText = deathDay !== null && deathDay !== undefined ? ` (day ${deathDay})` : '';
		const randomEmojis = ['🍆', '🔥', '💋', '✅', '🚬', '🍑', '🥫', '🫄', '🤡', '🔪', '🔊', '👉👈', '👁️👄👁️', '💪', '🌈', '🥋', '🎮'];
		const randomEmoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];

		await interaction.reply(`> ${randomEmoji} Updated ${monsterUpdated}${deathDayDisplayText} time of death: <t:${tod.unix()}:T>`);

		try {
			await updateTod({
				'name': monsterUpdated,
				'epochTod': tod.unix(),
				'lastDeathDay': deathDay
			});
			const result = await getMonsterData();
			const msg = await client.channels.cache.get(channelId).messages.fetch(messageId);
			await msg.edit(result);
		} catch (err) {
			console.error("Error:", err);
		}
	},
};

async function updateTod(monsterUpdate) {
    try {
        // Read the existing JSON file
        const data = await fs.readFile(path, 'utf8');
        const monsters = JSON.parse(data);

        // Update each monster in the array
        monsters.forEach(monster => {
            // Update the relevant monster by name
            if (monster.name === monsterUpdate.name) {
                monster.epochTod = monsterUpdate.epochTod;
                monster.lastDeathDay = monsterUpdate.lastDeathDay;

                // Calculate respawnTimeMinEpoch
                monster.respawnTimeMinEpoch = monster.epochTod + monster.respawnTimeMin;

                // Calculate respawnTimeMaxEpoch
                if (monster.respawnTimeMax) {
                    monster.respawnTimeMaxEpoch = monster.epochTod + monster.respawnTimeMax;
                } else {
                    monster.respawnTimeMaxEpoch = null; // Keep null if respawnTimeMax is null
                }
            }
        });

		await updateRsvpFile();
	
        // Write the updated JSON back to the file
        await fs.writeFile(rsvpPath, JSON.stringify(monsters, null, 4), 'utf8');
        console.log("Monster updated successfully!");
    } catch (err) {
        console.error("Error:", err);
    }
}

async function updateRsvpFile() {
    try {
        const data = await fs.readFile(path, 'utf8');
        const monsters = JSON.parse(data);
        const lines = [];

        monsters.forEach(monster => {
            if (monster.windows && monster.windowTime) {
                const cleanName = monster.name.replace(/[^\w\s]/gu, '').trim();

                for (let i = 1; i <= monster.windows; i++) {
                    const windowEpoch = monster.respawnTimeMinEpoch + (i * monster.windowTime);
                    lines.push(`${cleanName} (${i}/${monster.windows})|||${monster.respawnTimeMinEpoch}|||${windowEpoch}|||${cleanName}`);
                }
            }
        });

        await fs.writeFile(rsvpPath, lines.join('\n'), 'utf8');
        console.log("RSVP file updated successfully!");
    } catch (err) {
        console.error("Error:", err);
    }
}

async function getMonsterData() {
    try {
        // Read the existing JSON file
        const data = await fs.readFile(path, 'utf8');
        const monsters = JSON.parse(data);

        // String to collect all formatted outputs
        let allFormattedOutput = '';

        // Iterate over each monster and display the formatted information
        monsters.forEach(monster => {
            let monsterName = monster.displayText || monster.name;
			if (monster.lastDeathDay !== null && monster.lastDeathDay !== undefined) {
				const displayDeathDay = ` Day ${monster.lastDeathDay + 1} `;
				monsterName = insertBeforeLastChar(monsterName, displayDeathDay);
			}

			if (monsterName === "⚔️ Shikigami Weapon ⚔️" && Math.random() < 0.05) {
				monsterName = "⚔️ <@209114565601001472> Weapon ⚔️";
			}
			
			if (monsterName === "🐉 Fafnir 🐉" && Math.random() < 0.05) {
				monsterName = "🐉 Faefnir 🐉";
			}

			if (monsterName === "🔥 Tiamat Trouncers 🔥" && Math.random() < 0.01) {
				monsterName = "🔥 Tiamart Trouncers 🔥";
			}

			
			// if(date.getMonth() === 3 && date.getDate() === 1){
			// 	monsterName = aprilFools(monsterName);
			// }

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

            // Seperate NMs after "Adamantoise" & "Bloodsucc"
            if (monster.name === "🐢 Adamantoise 🐢" || monster.name === "🩸 Bloodsucc 🩸") {
                formattedOutput += `\n\n----------------------------------------------------------`;
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

function aprilFools(monsterName){
	switch (monsterName) {
        case "🐉 Fafnir 🐉":
            return "🪰🪰🐉🪰🪰 Dartners 🪰🪰🐉🪰🪰";
        case "🪰🪰 Behemoth 🪰🪰":
            return "🤣 Teeheemoth 😆";
        case "🔥 Tiamat Trouncers 🔥":
            return "🐑 Desantine Trounched This 🐑";
        case "🐢 Adamantoise 🐢":
            return "🐢 LWNQ 🐢";
        case "🦀 King Crab 🦀":
            return "🦀 Arcavi has really bad gear 🦀";
        case "⚔️ Shikigami Weapon ⚔️":
            return "⚔️ SHIKISHIMA WEAPON LOL!!! get it? <@209114565601001472> (lmao) <call4> ⚔️";
		case "🦂 King Vinegarroon 🦂":
			return "🦂 Serkets Cousin 🦂";
        case "🪶 Simurgh 🪶":
            return "🪶 The Simpsons 🪶";
        case "🩸 Bloodsucc 🩸":
            return "🩸 Succ me 🩸";
        case "🔥 Tiamat 🔥":
            return "🔥 Tiamart 🔥";
        case "🧊 Jormzhugand 🧊":
            return "🧊 Stupid gosh darn heckin dragon 🧊";
        case "💜 Vrtra Vanquishers 💜":
            return "💜 Fartra Fartquisher 💜";
    }
}

function insertBeforeLastChar(originalString, stringToInsert) {
    let characters = Array.from(originalString); // Convert to an array of characters to keep emojis 
    return characters.slice(0, -1).join('') + stringToInsert + characters.slice(-1).join('');
}
