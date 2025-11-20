const fs = require('fs').promises;
const path = require('path');
const fetchMainPage = require('./fetch_main_page');
const analyzeMainPage = require('./analyze_main_page');
const fetchVideoPage = require('./fetch_video_page');
const analyzeVideoPage = require('./analyze_video_page');
const generateUserscript = require('./generate_userscript');

async function runGenerator() {
  try {
    const config = JSON.parse(await fs.readFile('config.json', 'utf-8'));
    const websiteName = config.website_name;
    const matchUrl = new URL(config.main_page_url).hostname;

    console.log('--- Fetching Main Page ---');
    await fetchMainPage();

    console.log('--- Analyzing Main Page ---');
    // In a real scenario, this would return the thumbnail selector
    const thumbnailSelector = '.thumb-container'; // Placeholder
    // await analyzeMainPage(); // This would be an LLM call

    console.log('--- Fetching Video Page (using placeholder ID) ---');
    const placeholderVideoId = 'YOUR_VIDEO_ID'; // IMPORTANT: Replace with a real video ID for testing
    await fetchVideoPage(placeholderVideoId);

    console.log('--- Analyzing Video Page ---');
    // In a real scenario, this would return the video URL extraction logic
    const videoIdExtraction = `
        const href = thumbnail.href;
        if (href) {
            const match = href.match(/\/([^\/]+)$/);
            if (match) {
                return match[1];
            }
        }
        return thumbnail.dataset.videoId || thumbnail.querySelector('.title')?.textContent || null;
    `; // Placeholder
    const videoUrlExtraction = `
        const videoElement = doc.querySelector('video');
        if (videoElement) {
            videoMp4Url = videoElement.src;
        } else {
            const sourceElement = doc.querySelector('#vjsplayer source');
            if (sourceElement && sourceElement.src) {
                videoMp4Url = sourceElement.src;
            }
        }
    `; // Placeholder
    // await analyzeVideoPage(placeholderVideoId); // This would be an LLM call

    console.log('--- Generating Userscript ---');
    await generateUserscript(websiteName, matchUrl, thumbnailSelector, videoIdExtraction, videoUrlExtraction);

    console.log('--- Automation process complete ---');

  } catch (error) {
    console.error('Error during automation process:', error.message);
  }
}

runGenerator();
