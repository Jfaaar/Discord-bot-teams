
const ytdl = require('@distube/ytdl-core');

(async () => {
    const url = 'https://www.youtube.com/watch?v=8ui9umU0C2g';
    console.log(`Testing @distube/ytdl-core with URL: ${url}`);

    try {
        console.log('Fetching video info...');
        const info = await ytdl.getInfo(url);
        console.log('Video Info fetched successfully.');
        console.log('Title:', info.videoDetails.title);
        console.log('Formats count:', info.formats.length);

        // Filter for audio formats
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        console.log('Audio formats count:', audioFormats.length);

        if (audioFormats.length > 0) {
            console.log('First audio format URL:', audioFormats[0].url);
        } else {
            console.log('No audio formats found.');
        }

    } catch (error) {
        console.error('Error occurred:', error);
    }
})();
