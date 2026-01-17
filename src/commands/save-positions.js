const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Position emoji mappings (must match poll.js)
const EMOJI_TO_POSITION = {
    '🧤': 'GK',
    '🛡️': 'CB',
    '⬅️': 'LB',
    '➡️': 'RB',
    '🔒': 'CDM',
    '⚙️': 'CM',
    '🎯': 'CAM',
    '◀️': 'LM',
    '▶️': 'RM',
    '🌀': 'LW',
    '💫': 'RW',
    '⚡': 'ST',
};

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
        .setName('save-positions')
        .setDescription('Save player positions from the most recent poll')
        .addStringOption((option) =>
            option
                .setName('message_id')
                .setDescription('The message ID of the poll (right-click message → Copy ID)')
                .setRequired(true)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const messageId = interaction.options.getString('message_id');

            // Fetch the poll message
            let pollMessage;
            try {
                pollMessage = await interaction.channel.messages.fetch(messageId);
            } catch (error) {
                return interaction.editReply('❌ Could not find that message. Make sure you\'re in the same channel as the poll and the message ID is correct.');
            }

            // Check if it's a valid poll message (has the expected reactions)
            const reactions = pollMessage.reactions.cache;

            if (reactions.size === 0) {
                return interaction.editReply('❌ That message has no reactions. Make sure you selected the correct poll message.');
            }

            // Load existing roles
            const rolesData = loadPlayerRoles();
            const updatedPlayers = [];
            const skippedReactions = [];

            // Process each reaction
            for (const [emoji, reaction] of reactions) {
                const position = EMOJI_TO_POSITION[emoji];

                if (!position) {
                    skippedReactions.push(emoji);
                    continue;
                }

                // Fetch all users who reacted
                const users = await reaction.users.fetch();

                for (const [userId, user] of users) {
                    // Skip bot reactions
                    if (user.bot) continue;

                    // Get the member to get their display name
                    let displayName = user.displayName || user.username;

                    try {
                        const member = await interaction.guild.members.fetch(userId);
                        displayName = member.displayName || member.user.displayName || member.user.username;
                    } catch (e) {
                        // Use fallback display name if member fetch fails
                    }

                    // Initialize player array if not exists
                    if (!rolesData[displayName]) {
                        rolesData[displayName] = [];
                    }

                    // Add position if not already in their list
                    if (!rolesData[displayName].includes(position)) {
                        rolesData[displayName].push(position);
                    }

                    // Track updated players
                    if (!updatedPlayers.includes(displayName)) {
                        updatedPlayers.push(displayName);
                    }
                }
            }

            // Save updated roles
            savePlayerRoles(rolesData);

            // Build response embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Positions Saved!')
                .setColor(0x00AE86)
                .setTimestamp();

            if (updatedPlayers.length > 0) {
                const playersList = updatedPlayers
                    .map((name) => `• **${name}** → ${rolesData[name].join(', ')}`)
                    .join('\n');

                embed.addFields({
                    name: `📋 Updated Players (${updatedPlayers.length})`,
                    value: playersList.substring(0, 1024),
                    inline: false,
                });
            } else {
                embed.setDescription('No new player positions were found.');
            }

            if (skippedReactions.length > 0) {
                embed.addFields({
                    name: '⚠️ Skipped Reactions',
                    value: `Unknown emojis: ${skippedReactions.join(' ')}`,
                    inline: false,
                });
            }

            embed.setFooter({
                text: 'Player positions saved to database',
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in /save-positions command:', error);
            try {
                await interaction.editReply('❌ An error occurred while saving positions.');
            } catch (e) {
                console.error('Failed to send error reply:', e);
            }
        }
    },
};
