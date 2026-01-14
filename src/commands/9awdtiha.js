const { SlashCommandBuilder } = require('discord.js');

// Target voice channel ID
const TARGET_CHANNEL_ID = '1460685047358033932';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('9awdtiha')
        .setDescription('Move you and a tagged user to a private voice channel')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to bring with you')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const caller = interaction.member;
        const targetUser = interaction.options.getMember('user');

        // Validate target user exists
        if (!targetUser) {
            return interaction.editReply('❌ User not found in this server.');
        }

        // Check if caller is in a voice channel
        if (!caller.voice.channel) {
            return interaction.editReply('❌ You must be in a voice channel to use this command.');
        }

        // Check if target user is in a voice channel
        if (!targetUser.voice.channel) {
            return interaction.editReply(`❌ ${targetUser.user.displayName} must be in a voice channel.`);
        }

        // Fetch the target voice channel
        const targetChannel = await guild.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);

        if (!targetChannel || !targetChannel.isVoiceBased()) {
            return interaction.editReply('❌ Target voice channel not found.');
        }

        // Move both users to the target channel
        try {
            await Promise.all([
                caller.voice.setChannel(targetChannel),
                targetUser.voice.setChannel(targetChannel),
            ]);

            await interaction.editReply(`✅ Moved you and ${targetUser.user.displayName} to ${targetChannel.name}!`);
        } catch (error) {
            console.error('Error moving users:', error);
            await interaction.editReply('❌ Failed to move users. Make sure the bot has permission to move members.');
        }
    },
};
