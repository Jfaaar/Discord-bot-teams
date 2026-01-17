const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Position emoji mappings
const POSITION_EMOJIS = {
    GK: '🧤',
    CB: '🛡️',
    LB: '⬅️',
    RB: '➡️',
    LWB: '↙️',
    RWB: '↗️',
    CDM: '🔒',
    CM: '⚙️',
    CAM: '🎯',
    LM: '◀️',
    RM: '▶️',
    LW: '🌀',
    RW: '💫',
    ST: '⚡',
    CF: '🔥',
};

// Ordered list of positions for the poll
const POLL_POSITIONS = [
    { name: 'GK', emoji: '🧤', category: 'Goalkeeper' },
    { name: 'CB', emoji: '🛡️', category: 'Defense' },
    { name: 'LB', emoji: '⬅️', category: 'Defense' },
    { name: 'RB', emoji: '➡️', category: 'Defense' },
    { name: 'CDM', emoji: '🔒', category: 'Midfield' },
    { name: 'CM', emoji: '⚙️', category: 'Midfield' },
    { name: 'CAM', emoji: '🎯', category: 'Midfield' },
    { name: 'LM', emoji: '◀️', category: 'Midfield' },
    { name: 'RM', emoji: '▶️', category: 'Midfield' },
    { name: 'LW', emoji: '🌀', category: 'Attack' },
    { name: 'RW', emoji: '💫', category: 'Attack' },
    { name: 'ST', emoji: '⚡', category: 'Attack' },
];

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
        .setName('poll')
        .setDescription('Create a position poll for players to select their positions'),

    async execute(interaction) {
        try {
            // Build the poll embed
            const embed = new EmbedBuilder()
                .setTitle('🎮 Position Poll')
                .setDescription(
                    '**React with the positions you can play!**\n' +
                    'Select ALL positions you\'re comfortable playing.\n\n' +
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                )
                .setColor(0x5865F2)
                .setTimestamp();

            // Group positions by category
            const goalkeeper = POLL_POSITIONS.filter(p => p.category === 'Goalkeeper');
            const defense = POLL_POSITIONS.filter(p => p.category === 'Defense');
            const midfield = POLL_POSITIONS.filter(p => p.category === 'Midfield');
            const attack = POLL_POSITIONS.filter(p => p.category === 'Attack');

            // Add fields for each category
            if (goalkeeper.length > 0) {
                embed.addFields({
                    name: '🧤 Goalkeeper',
                    value: goalkeeper.map(p => `${p.emoji} = **${p.name}**`).join('\n'),
                    inline: true,
                });
            }

            embed.addFields({
                name: '🛡️ Defense',
                value: defense.map(p => `${p.emoji} = **${p.name}**`).join('\n'),
                inline: true,
            });

            embed.addFields({
                name: '🎯 Midfield',
                value: midfield.map(p => `${p.emoji} = **${p.name}**`).join('\n'),
                inline: true,
            });

            embed.addFields({
                name: '⚡ Attack',
                value: attack.map(p => `${p.emoji} = **${p.name}**`).join('\n'),
                inline: true,
            });

            embed.addFields({
                name: '\u200B',
                value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
                    '💡 **Tip:** Use `/save-positions` to save reactions to the database!',
                inline: false,
            });

            embed.setFooter({
                text: 'React below to vote for your positions • Poll created by FC MERGED Bot',
            });

            // Send the poll message
            const pollMessage = await interaction.reply({
                embeds: [embed],
                fetchReply: true,
            });

            // Add reactions for each position
            for (const position of POLL_POSITIONS) {
                await pollMessage.react(position.emoji);
            }

        } catch (error) {
            console.error('Error in /poll command:', error);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp('❌ An error occurred while creating the poll.');
                } else {
                    await interaction.reply('❌ An error occurred while creating the poll.');
                }
            } catch (e) {
                console.error('Failed to send error reply:', e);
            }
        }
    },
};
