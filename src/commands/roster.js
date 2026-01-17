const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Default formation for auto-assignment
const DEFAULT_FORMATION = {
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
};

// All positions a flex player can play
const ALL_POSITIONS = ['LB', 'CB', 'RB', 'CDM', 'CM', 'LM', 'RM', 'CAM', 'LW', 'RW', 'ST', 'LS', 'RS'];

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
 * Returns array of specific positions or null for flex player
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
 * Assign positions to players based on formation and their position preferences
 * Priority: Attack first, then Midfield, then Defense
 */
function assignPositions(members, formation, rolesData) {
    const positions = [...formation.positions];
    const assignments = [];

    // Build player list with their allowed positions
    const players = members.map((member) => ({
        member,
        name: member.user.displayName,
        positions: getPlayerPositions(member.user.displayName, rolesData) || ALL_POSITIONS,
        isFlex: getPlayerPositions(member.user.displayName, rolesData) === null,
        assigned: false,
    }));

    // Shuffle players for randomness
    const shuffledPlayers = shuffleArray(players);

    // Group positions by role priority: attack, midfield, defense
    const attackPositions = positions.filter((p) => p.role === 'attack');
    const midfieldPositions = positions.filter((p) => p.role === 'midfield');
    const defensePositions = positions.filter((p) => p.role === 'defense');

    // Helper to assign a position - matches by specific position name
    const assignPosition = (position, availablePlayers) => {
        // Find player that can play this specific position
        const playerIdx = availablePlayers.findIndex(
            (p) => !p.assigned && p.positions.includes(position.name)
        );

        if (playerIdx !== -1) {
            const player = availablePlayers[playerIdx];
            player.assigned = true;
            assignments.push({
                position: position.name,
                role: position.role,
                player: player.member,
                playerName: player.name,
                isFlex: player.isFlex,
            });
            return true;
        }
        return false;
    };

    // Assign attack positions first (priority)
    for (const pos of attackPositions) {
        assignPosition(pos, shuffledPlayers);
    }

    // Assign midfield positions second
    for (const pos of midfieldPositions) {
        assignPosition(pos, shuffledPlayers);
    }

    // Assign defense positions last
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
                role: pos.role,
                player: player.member,
                playerName: player.name,
                isFlex: player.isFlex,
            });
        }
    }

    // Track truly unassigned players (substitutes)
    const unassigned = shuffledPlayers.filter((p) => !p.assigned);

    return { assignments, unassigned };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roster')
        .setDescription('Show online players with positions and auto-assign to formation'),

    async execute(interaction) {
        try {
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

            // === SECTION 1: Saved Player Roles ===
            const savedRolesEntries = Object.entries(rolesData);
            let savedRolesText = '';
            if (savedRolesEntries.length > 0) {
                savedRolesText = savedRolesEntries
                    .map(([name, positions]) => `• **${name}** → ${positions.join(', ')}`)
                    .join('\n');
            } else {
                savedRolesText = '*No saved player roles*';
            }

            // === SECTION 2: Online Players with Their Positions ===
            const onlinePlayersList = members.map((member) => {
                const name = member.user.displayName;
                const positions = getPlayerPositions(name, rolesData);

                if (positions) {
                    return `• **${name}** → ${positions.join(', ')}`;
                } else {
                    return `• **${name}** → 🔄 *Flex (can play any)*`;
                }
            });

            // === SECTION 3: Auto-Assign to Formation (Attack Priority) ===
            const { assignments, unassigned } = assignPositions(members, DEFAULT_FORMATION, rolesData);

            // Group assignments by role for display
            const attackAssignments = assignments.filter((a) => a.role === 'attack');
            const midfieldAssignments = assignments.filter((a) => a.role === 'midfield');
            const defenseAssignments = assignments.filter((a) => a.role === 'defense');

            // Build position assignment text
            const formatAssignment = (a) => {
                const flexTag = a.isFlex ? ' 🔄' : '';
                return `**${a.position}**: ${a.playerName}${flexTag}`;
            };

            // Build the embed
            const embed = new EmbedBuilder()
                .setTitle(`📋 Roster & Positions - ${sourceChannel.name}`)
                .setColor(0x5865F2)
                .setTimestamp();

            // Add saved roles section
            embed.addFields({
                name: '📁 Saved Player Roles',
                value: savedRolesText.substring(0, 1024),
                inline: false,
            });

            // Add online players section
            embed.addFields({
                name: `🟢 Online Players (${members.length})`,
                value: onlinePlayersList.join('\n').substring(0, 1024),
                inline: false,
            });

            // Add formation assignment header
            embed.addFields({
                name: `⚽ Auto-Assignment (${DEFAULT_FORMATION.name})`,
                value: '*Attack priority → Midfield → Defense*',
                inline: false,
            });

            // Add attack assignments
            if (attackAssignments.length > 0) {
                embed.addFields({
                    name: '⚡ Attack',
                    value: attackAssignments.map(formatAssignment).join('\n'),
                    inline: true,
                });
            }

            // Add midfield assignments
            if (midfieldAssignments.length > 0) {
                embed.addFields({
                    name: '🎯 Midfield',
                    value: midfieldAssignments.map(formatAssignment).join('\n'),
                    inline: true,
                });
            }

            // Add defense assignments
            if (defenseAssignments.length > 0) {
                embed.addFields({
                    name: '🛡️ Defense',
                    value: defenseAssignments.map(formatAssignment).join('\n'),
                    inline: true,
                });
            }

            // Add substitutes if any
            if (unassigned.length > 0) {
                embed.addFields({
                    name: '👋 Substitutes',
                    value: unassigned.map((p) => `• ${p.name}`).join('\n'),
                    inline: false,
                });
            }

            embed.setFooter({
                text: `${assignments.length} positions filled | 🔄 = Flex player | Use /positions for different formations`
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in /roster command:', error);
            try {
                await interaction.editReply('❌ An error occurred while fetching the roster.');
            } catch (e) {
                console.error('Failed to send error reply:', e);
            }
        }
    },
};
