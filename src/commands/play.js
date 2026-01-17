const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue, createQueue, searchYouTube, playNext, connectAndPlay } = require('../utils/music-manager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Name of the song to play')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        // Check if user is in a voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply('❌ You need to be in a voice channel to play music!');
        }

        // Check bot permissions
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.editReply('❌ I need permissions to join and speak in your voice channel!');
        }

        const songQuery = interaction.options.getString('song');

        // Search for the song
        const songInfo = await searchYouTube(songQuery);
        if (!songInfo) {
            return interaction.editReply(`❌ No results found for: **${songQuery}**`);
        }

        const song = {
            title: songInfo.title,
            url: songInfo.url,
            duration: songInfo.duration,
            thumbnail: songInfo.thumbnail,
            requestedBy: interaction.user.displayName,
        };

        let queue = getQueue(interaction.guild.id);

        if (!queue) {
            // Create new queue
            queue = createQueue(interaction.guild.id, voiceChannel, interaction.channel);
            queue.songs.push(song);

            const connected = await connectAndPlay(queue);
            if (!connected) {
                return interaction.editReply('❌ Failed to connect to voice channel!');
            }

            // Now playing embed
            const embed = new EmbedBuilder()
                .setTitle('🎵 Now Playing')
                .setDescription(`**[${song.title}](${song.url})**`)
                .addFields(
                    { name: 'Duration', value: song.duration || 'Unknown', inline: true },
                    { name: 'Requested by', value: song.requestedBy, inline: true }
                )
                .setColor(0x00AE86)
                .setTimestamp();

            if (song.thumbnail) {
                embed.setThumbnail(song.thumbnail);
            }

            return interaction.editReply({ embeds: [embed] });
        } else {
            // Add to existing queue
            queue.songs.push(song);

            const embed = new EmbedBuilder()
                .setTitle('🎵 Added to Queue')
                .setDescription(`**[${song.title}](${song.url})**`)
                .addFields(
                    { name: 'Position', value: `#${queue.songs.length}`, inline: true },
                    { name: 'Duration', value: song.duration || 'Unknown', inline: true }
                )
                .setColor(0x0099ff)
                .setTimestamp();

            if (song.thumbnail) {
                embed.setThumbnail(song.thumbnail);
            }

            return interaction.editReply({ embeds: [embed] });
        }
    },
};
