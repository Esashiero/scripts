const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

async function fetchVideoPage(videoId) {
  try {
    const config = JSON.parse(await fs.readFile('config.json', 'utf-8'));
    const videoPageUrl = config.video_page_url_pattern.replace('{videoId}', videoId);
    const response = await axios.get(videoPageUrl);
    const outputPath = path.join('output', `${config.website_name}_video_page_${videoId}.html`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, response.data);
    console.log(`Video page HTML for video ID ${videoId} saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error fetching video page for video ID ${videoId}:`, error.message);
  }
}

// Example usage: Replace 'YOUR_VIDEO_ID' with an actual video ID from the target website
fetchVideoPage('YOUR_VIDEO_ID');
