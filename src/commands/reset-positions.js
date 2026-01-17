const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Path to player roles data
const ROLES_PATH = path.join(__dirname, '../data/player-roles.json');

/**
 * Load player roles from JSON file
 */
function loadPlayerRoles() {
    try {
        const data = fs.readFileSync(ROLES_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

/**
 * Save player roles to JSON file
 */
function savePlayerRoles(rolesData) {
    fs.writeFileSync(ROLES_PATH, JSON.stringify(rolesData, null, 4), 'utf8');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset-positions')
        .setDescription('Reset all saved player positions before a new poll')
        .addStringOption((option) =>
            option
                .setName('player')
                .setDescription('Reset a specific player (leave empty to reset ALL)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const playerName = interaction.options.getString('player');
            const rolesData = loadPlayerRoles();

            // Check if resetting specific player or all
            if (playerName) {
                // Reset specific player
                let found = false;
                let matchedName = playerName;

                // Try exact match first
                if (rolesData[playerName]) {
                    delete rolesData[playerName];
                    found = true;
                    matchedName = playerName;
                } else {
                    // Try case-insensitive match
                    const lowerName = playerName.toLowerCase();
                    for (const name of Object.keys(rolesData)) {
                        if (name.toLowerCase() === lowerName) {
                            delete rolesData[name];
                            found = true;
                            matchedName = name;
                            break;
                        }
                    }
                }

                if (found) {
                    savePlayerRoles(rolesData);

                    const embed = new EmbedBuilder()
                        .setTitle('🗑️ Player Reset')
                        .setDescription(`Cleared all positions for **${matchedName}**`)
                        .setColor(0xFFA500)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.reply(`❌ Player **${playerName}** not found in the database.`);
                }
            } else {
                // Reset ALL players
                const playerCount = Object.keys(rolesData).length;

                if (playerCount === 0) {
                    await interaction.reply('ℹ️ No player positions to reset - database is already empty.');
                    return;
                }

                // Clear all positions
                savePlayerRoles({});

                const embed = new EmbedBuilder()
                    .setTitle('🗑️ All Positions Reset!')
                    .setDescription(`Cleared positions for **${playerCount}** players.\n\nRun \`/poll\` to start a fresh position poll!`)
                    .setColor(0xFF6B6B)
                    .setTimestamp()
                    .setFooter({ text: 'All player data has been cleared' });

                await interaction.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in /reset-positions command:', error);
            await interaction.reply('❌ An error occurred while resetting positions.');
        }
    },
};
