const { SlashCommandBuilder } = require('discord.js');

// Target voice channel ID for /skhirat command
const TARGET_CHANNEL_ID = '1460674259809603697';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skhirat')
        .setDescription('Move everyone in the server to the Skhirat voice channel'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;

        // Fetch the target voice channel
        const targetChannel = await guild.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);

        if (!targetChannel || !targetChannel.isVoiceBased()) {
            return interaction.editReply('❌ Target voice channel not found.');
        }

        // Get all members currently in voice channels
        const voiceMembers = [];
        guild.channels.cache.forEach(channel => {
            if (channel.isVoiceBased() && channel.id !== TARGET_CHANNEL_ID) {
                channel.members.forEach(member => {
                    voiceMembers.push(member);
                });
            }
        });

        if (voiceMembers.length === 0) {
            return interaction.editReply('❌ No members found in voice channels to move.');
        }

        // Move all members to the target channel
        try {
            const movePromises = voiceMembers.map(member =>
                member.voice.setChannel(targetChannel).catch(err => {
                    console.error(`Failed to move ${member.user.tag}:`, err);
                    return null;
                })
            );

            const results = await Promise.all(movePromises);
            const successCount = results.filter(r => r !== null).length;

            await interaction.editReply(`✅ Moved ${successCount}/${voiceMembers.length} members to ${targetChannel.name}!`);
        } catch (error) {
            console.error('Error moving users:', error);
            await interaction.editReply('❌ Failed to move users. Make sure the bot has permission to move members.');
        }
    },
};
