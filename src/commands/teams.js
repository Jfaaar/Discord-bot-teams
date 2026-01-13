const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

/**
 * Shuffles an array in place using Fisher-Yates algorithm
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
 * Splits an array into two roughly equal halves
 */
function splitIntoTeams(members) {
    const shuffled = shuffleArray(members);
    const midpoint = Math.ceil(shuffled.length / 2);
    return {
        team1: shuffled.slice(0, midpoint),
        team2: shuffled.slice(midpoint),
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('teams')
        .setDescription('Split players in voice channel into two teams'),

    async execute(interaction) {
        await interaction.deferReply();

        const {
            SOURCE_VOICE_CHANNEL_ID,
            TEAM1_VOICE_CHANNEL_ID,
            TEAM2_VOICE_CHANNEL_ID,
            TEAMS_TEXT_CHANNEL_ID,
        } = process.env;

        // Validate environment variables
        if (!SOURCE_VOICE_CHANNEL_ID || !TEAM1_VOICE_CHANNEL_ID || !TEAM2_VOICE_CHANNEL_ID || !TEAMS_TEXT_CHANNEL_ID) {
            return interaction.editReply('❌ Bot is not configured properly. Please check environment variables.');
        }

        // Fetch the source voice channel
        const sourceChannel = await interaction.guild.channels.fetch(SOURCE_VOICE_CHANNEL_ID).catch(() => null);

        if (!sourceChannel || !sourceChannel.isVoiceBased()) {
            return interaction.editReply('❌ Source voice channel not found.');
        }

        // Get members in the voice channel
        const members = [...sourceChannel.members.values()];

        if (members.length < 2) {
            return interaction.editReply('❌ Need at least 2 players in the voice channel to create teams.');
        }

        // Split into teams
        const { team1, team2 } = splitIntoTeams(members);

        // Fetch destination channels
        const team1Channel = await interaction.guild.channels.fetch(TEAM1_VOICE_CHANNEL_ID).catch(() => null);
        const team2Channel = await interaction.guild.channels.fetch(TEAM2_VOICE_CHANNEL_ID).catch(() => null);

        if (!team1Channel || !team2Channel) {
            return interaction.editReply('❌ Team voice channels not found.');
        }

        // Move players to their team channels
        const movePromises = [
            ...team1.map((member) => member.voice.setChannel(team1Channel).catch(() => null)),
            ...team2.map((member) => member.voice.setChannel(team2Channel).catch(() => null)),
        ];

        await Promise.all(movePromises);

        // Create team embed
        const embed = new EmbedBuilder()
            .setTitle('⚽ Teams Created!')
            .setColor(0x00AE86)
            .addFields(
                {
                    name: '🔵 FC MERGED',
                    value: team1.map((m) => m.user.displayName).join('\n') || 'No players',
                    inline: true,
                },
                {
                    name: '🔴 Skhirat FC',
                    value: team2.map((m) => m.user.displayName).join('\n') || 'No players',
                    inline: true,
                }
            )
            .setFooter({ text: `${members.length} players split into teams` })
            .setTimestamp();

        // Post to text channel
        const textChannel = await interaction.guild.channels.fetch(TEAMS_TEXT_CHANNEL_ID).catch(() => null);

        if (textChannel && textChannel.isTextBased()) {
            await textChannel.send({ embeds: [embed] });
        }

        // Reply to the command
        await interaction.editReply({ content: '✅ Teams created and players moved!', embeds: [embed] });
    },
};
