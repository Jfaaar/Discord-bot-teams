const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, deleteQueue } = require('../utils/music-manager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playing music and disconnect'),

    async execute(interaction) {
        await interaction.deferReply();

        const queue = getQueue(interaction.guild.id);

        if (!queue) {
            return interaction.editReply('❌ There is no music playing!');
        }

        // Clear the queue and disconnect
        const songsCleared = queue.songs.length;
        deleteQueue(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle('⏹️ Music Stopped')
            .setDescription('Disconnected from the voice channel.')
            .addFields(
                { name: 'Songs cleared', value: `${songsCleared}`, inline: true }
            )
            .setColor(0xff6b6b)
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },
};
