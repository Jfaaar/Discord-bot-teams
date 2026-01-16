const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

/**
 * Load player roles from JSON file
 */
function loadPlayerRoles() {
    const rolesPath = path.join(__dirname, '../data/player-roles.json');
    try {
        const data = fs.readFileSync(rolesPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.warn('Could not load player-roles.json, using empty roles');
        return {};
    }
}

/**
 * Get player's allowed positions by display name
 */
function getPlayerPositions(playerName, rolesData) {
    // Try exact match first
    if (rolesData[playerName]) {
        return rolesData[playerName];
    }
    // Try case-insensitive match
    const lowerName = playerName.toLowerCase();
    for (const [name, positions] of Object.entries(rolesData)) {
        if (name.toLowerCase() === lowerName) {
            return positions;
        }
    }
    // Default: flex player (all positions)
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster')
        .setDescription('Show online players and their possible positions'),

    async execute(interaction) {
        await interaction.deferReply();

        const { SOURCE_VOICE_CHANNEL_ID } = process.env;

        // Validate environment variable
        if (!SOURCE_VOICE_CHANNEL_ID) {
            return interaction.editReply('❌ Bot is not configured. Please set SOURCE_VOICE_CHANNEL_ID.');
        }

        // Fetch the source voice channel
        const sourceChannel = await interaction.guild.channels
            .fetch(SOURCE_VOICE_CHANNEL_ID)
            .catch(() => null);

        if (!sourceChannel || !sourceChannel.isVoiceBased()) {
            return interaction.editReply('❌ Source voice channel not found.');
        }

        // Get members in the voice channel
        const members = [...sourceChannel.members.values()];

        if (members.length < 1) {
            return interaction.editReply('❌ No players in the voice channel.');
        }

        // Load player roles
        const rolesData = loadPlayerRoles();

        // Build player list with positions
        const playersList = members.map((member) => {
            const name = member.user.displayName;
            const positions = getPlayerPositions(name, rolesData);

            if (positions) {
                return `**${name}** → ${positions.join(', ')}`;
            } else {
                return `**${name}** → 🔄 *Flex (all positions)*`;
            }
        });

        // Build the embed
        const embed = new EmbedBuilder()
            .setTitle(`📋 Current Roster - ${sourceChannel.name}`)
            .setColor(0x5865F2)
            .setDescription(playersList.join('\n'))
            .addFields({
                name: '📊 Summary',
                value: `**${members.length}** players online`,
                inline: true,
            })
            .setFooter({ text: 'Use /positions to assign positions based on formation' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
};
