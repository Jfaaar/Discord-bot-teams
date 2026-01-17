const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const playDl = require('play-dl');

// Store for music queues per guild
const queues = new Map();

/**
 * Get or create a queue for a guild
 */
function getQueue(guildId) {
    return queues.get(guildId);
}

/**
 * Create a new queue for a guild
 */
function createQueue(guildId, voiceChannel, textChannel) {
    const queue = {
        guildId,
        voiceChannel,
        textChannel,
        connection: null,
        player: createAudioPlayer(),
        songs: [],
        playing: false,
    };

    queues.set(guildId, queue);
    return queue;
}

/**
 * Delete a guild's queue and disconnect
 */
function deleteQueue(guildId) {
    const queue = queues.get(guildId);
    if (queue) {
        queue.player.stop();
        if (queue.connection) {
            queue.connection.destroy();
        }
        queues.delete(guildId);
    }
}

/**
 * Search YouTube for a song and return info
 */
async function searchYouTube(query) {
    try {
        const results = await playDl.search(query, { limit: 1 });
        if (results.length === 0) return null;

        return {
            title: results[0].title,
            url: results[0].url,
            duration: results[0].durationRaw,
            thumbnail: results[0].thumbnails[0]?.url || null,
        };
    } catch (error) {
        console.error('YouTube search error:', error);
        return null;
    }
}

/**
 * Play the next song in the queue
 */
async function playNext(queue) {
    if (queue.songs.length === 0) {
        queue.playing = false;
        // Disconnect after 30 seconds of inactivity
        setTimeout(() => {
            const currentQueue = getQueue(queue.guildId);
            if (currentQueue && !currentQueue.playing && currentQueue.songs.length === 0) {
                deleteQueue(queue.guildId);
            }
        }, 30000);
        return;
    }

    const song = queue.songs[0];
    queue.playing = true;

    try {
        const stream = await playDl.stream(song.url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
        });

        queue.player.play(resource);
        queue.connection.subscribe(queue.player);

    } catch (error) {
        console.error('Error playing song:', error);
        queue.songs.shift();
        playNext(queue);
    }
}

/**
 * Connect to a voice channel and start playing
 */
async function connectAndPlay(queue) {
    try {
        queue.connection = joinVoiceChannel({
            channelId: queue.voiceChannel.id,
            guildId: queue.guildId,
            adapterCreator: queue.voiceChannel.guild.voiceAdapterCreator,
        });

        // Wait for connection to be ready
        await entersState(queue.connection, VoiceConnectionStatus.Ready, 30000);

        // Handle player state changes
        queue.player.on(AudioPlayerStatus.Idle, () => {
            queue.songs.shift();
            playNext(queue);
        });

        queue.player.on('error', (error) => {
            console.error('Audio player error:', error);
            queue.songs.shift();
            playNext(queue);
        });

        // Handle disconnection
        queue.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(queue.connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(queue.connection, VoiceConnectionStatus.Connecting, 5000),
                ]);
            } catch {
                deleteQueue(queue.guildId);
            }
        });

        await playNext(queue);
        return true;
    } catch (error) {
        console.error('Connection error:', error);
        deleteQueue(queue.guildId);
        return false;
    }
}

module.exports = {
    getQueue,
    createQueue,
    deleteQueue,
    searchYouTube,
    playNext,
    connectAndPlay,
};
