const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Formation definitions (no GK - outfield only)
const FORMATIONS = {
    '4-2-1-3': {
        name: '4-2-1-3',
        positions: [
            { role: 'defense', name: 'LB' },
            { role: 'defense', name: 'CB' },
            { role: 'defense', name: 'CB' },
            { role: 'defense', name: 'RB' },
            { role: 'midfield', name: 'CDM' },
            { role: 'midfield', name: 'CDM' },
            { role: 'attack', name: 'CAM' },
            { role: 'attack', name: 'LW' },
            { role: 'attack', name: 'ST' },
            { role: 'attack', name: 'RW' },
        ],
    },
    '4-1-2-1-2': {
        name: '4-1-2-1-2',
        positions: [
            { role: 'defense', name: 'LB' },
            { role: 'defense', name: 'CB' },
            { role: 'defense', name: 'CB' },
            { role: 'defense', name: 'RB' },
            { role: 'midfield', name: 'CDM' },
            { role: 'midfield', name: 'RM' },
            { role: 'midfield', name: 'LM' },
            { role: 'attack', name: 'CAM' },
            { role: 'attack', name: 'LS' },
            { role: 'attack', name: 'RS' },
        ],
    },
};

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
 * Get player's allowed roles by display name
 */
function getPlayerRoles(playerName, rolesData) {
    // Try exact match first
    if (rolesData[playerName]) {
        return rolesData[playerName];
    }
    // Try case-insensitive match
    const lowerName = playerName.toLowerCase();
    for (const [name, roles] of Object.entries(rolesData)) {
        if (name.toLowerCase() === lowerName) {
            return roles;
        }
    }
    // Default: can play any position (flex player)
    return ['attack', 'midfield', 'defense'];
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Assign positions to players based on formation and roles
 * Priority: Attack first, then Midfield, then Defense
 */
function assignPositions(members, formation) {
    const rolesData = loadPlayerRoles();
    const positions = [...formation.positions];
    const assignments = [];
    const unassigned = [];

    // Build player list with their allowed roles
    const players = members.map((member) => ({
        member,
        name: member.user.displayName,
        roles: getPlayerRoles(member.user.displayName, rolesData),
        assigned: false,
    }));

    // Shuffle players for randomness
    const shuffledPlayers = shuffleArray(players);

    // Group positions by role priority: attack, midfield, defense
    const attackPositions = positions.filter((p) => p.role === 'attack');
    const midfieldPositions = positions.filter((p) => p.role === 'midfield');
    const defensePositions = positions.filter((p) => p.role === 'defense');

    // Helper to assign a position
    const assignPosition = (position, availablePlayers) => {
        // Find player that can play this role
        const playerIdx = availablePlayers.findIndex(
            (p) => !p.assigned && p.roles.includes(position.role)
        );

        if (playerIdx !== -1) {
            const player = availablePlayers[playerIdx];
            player.assigned = true;
            assignments.push({
                position: position.name,
                player: player.member,
                playerName: player.name,
            });
            return true;
        }
        return false;
    };

    // Assign attack positions first
    for (const pos of attackPositions) {
        assignPosition(pos, shuffledPlayers);
    }

    // Assign midfield positions
    for (const pos of midfieldPositions) {
        assignPosition(pos, shuffledPlayers);
    }

    // Assign defense positions
    for (const pos of defensePositions) {
        assignPosition(pos, shuffledPlayers);
    }

    // Fill remaining positions with unassigned flex players
    const remainingPositions = positions.filter(
        (p) => !assignments.find((a) => a.position === p.name)
    );
    const remainingPlayers = shuffledPlayers.filter((p) => !p.assigned);

    for (const pos of remainingPositions) {
        if (remainingPlayers.length > 0) {
            const player = remainingPlayers.shift();
            player.assigned = true;
            assignments.push({
                position: pos.name,
                player: player.member,
                playerName: player.name,
            });
        }
    }

    // Track truly unassigned players
    for (const player of shuffledPlayers) {
        if (!player.assigned) {
            unassigned.push(player.member);
        }
    }

    return { assignments, unassigned };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('positions')
        .setDescription('Assign positions to players based on formation')
        .addStringOption((option) =>
            option
                .setName('formation')
                .setDescription('The formation to use')
                .setRequired(true)
                .addChoices(
                    { name: '4-2-1-3', value: '4-2-1-3' },
                    { name: '4-1-2-1-2', value: '4-1-2-1-2' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const formationName = interaction.options.getString('formation');
        const formation = FORMATIONS[formationName];

        if (!formation) {
            return interaction.editReply('❌ Invalid formation selected.');
        }

        const { SOURCE_VOICE_CHANNEL_ID, TEAMS_TEXT_CHANNEL_ID } = process.env;

        // Validate environment variables
        if (!SOURCE_VOICE_CHANNEL_ID) {
            return interaction.editReply('❌ Bot is not configured properly. Please set SOURCE_VOICE_CHANNEL_ID.');
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

        // Assign positions
        const { assignments, unassigned } = assignPositions(members, formation);

        // Sort assignments by position type for display
        const positionOrder = ['LB', 'CB', 'RB', 'CDM', 'LM', 'RM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'LS', 'RS'];
        assignments.sort((a, b) => {
            return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
        });

        // Build the embed
        const embed = new EmbedBuilder()
            .setTitle(`⚽ Position Assignment - ${formationName}`)
            .setColor(0x00AE86)
            .setTimestamp();

        // Group by role for display
        const defense = assignments.filter((a) =>
            ['LB', 'CB', 'RB'].includes(a.position)
        );
        const midfield = assignments.filter((a) =>
            ['CDM', 'LM', 'RM', 'CM'].includes(a.position)
        );
        const attack = assignments.filter((a) =>
            ['CAM', 'LW', 'RW', 'ST', 'LS', 'RS'].includes(a.position)
        );

        if (defense.length > 0) {
            embed.addFields({
                name: '🛡️ Defense',
                value: defense.map((a) => `**${a.position}**: ${a.player.user}`).join('\n'),
                inline: false,
            });
        }

        if (midfield.length > 0) {
            embed.addFields({
                name: '🎯 Midfield',
                value: midfield.map((a) => `**${a.position}**: ${a.player.user}`).join('\n'),
                inline: false,
            });
        }

        if (attack.length > 0) {
            embed.addFields({
                name: '⚡ Attack',
                value: attack.map((a) => `**${a.position}**: ${a.player.user}`).join('\n'),
                inline: false,
            });
        }

        if (unassigned.length > 0) {
            embed.addFields({
                name: '👋 Substitutes',
                value: unassigned.map((m) => m.user.toString()).join('\n'),
                inline: false,
            });
        }

        embed.setFooter({ text: `${assignments.length} positions assigned | ${members.length} players` });

        // Post to text channel if configured
        if (TEAMS_TEXT_CHANNEL_ID) {
            const textChannel = await interaction.guild.channels
                .fetch(TEAMS_TEXT_CHANNEL_ID)
                .catch(() => null);

            if (textChannel && textChannel.isTextBased()) {
                await textChannel.send({ embeds: [embed] });
            }
        }

        // Reply to the command
        await interaction.editReply({ content: '✅ Positions assigned!', embeds: [embed] });
    },
};
