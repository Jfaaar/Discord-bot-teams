
const playDl = require('play-dl');

(async () => {
    const url = 'https://www.youtube.com/watch?v=8ui9umU0C2g';
    console.log(`Testing play-dl with URL: ${url}`);

    try {
        console.log('Fetching video info...');
        const info = await playDl.video_info(url);
        console.log('Video Info fetched successfully.');
        console.log('Title:', info.video_details.title);
        console.log('Formats count:', info.format.length);

        // Inspect formats
        info.format.forEach((f, i) => {
            console.log(`Format ${i}: mime=${f.mimeType}, quality=${f.qualityLabel}, url=${f.url ? 'Yes' : 'No'}`);
        });

    } catch (error) {
        console.error('Error occurred:', error);
    }
})();
