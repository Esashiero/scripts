const fs = require('fs').promises;
const path = require('path');

async function generateUserscript(websiteName, matchUrl, thumbnailSelector, videoIdExtraction, videoUrlExtraction) {
  try {
    let template = await fs.readFile('userscript_template.js', 'utf-8');

    const prefix = websiteName.toLowerCase().substring(0, 2);

    template = template.replace(/{{WEBSITE_NAME}}/g, websiteName);
    template = template.replace(/{{MATCH_URL}}/g, matchUrl);
    template = template.replace(/{{THUMBNAIL_SELECTOR}}/g, thumbnailSelector);
    template = template.replace(/{{PREFIX}}/g, prefix);
    template = template.replace('// TODO: Implement logic to extract video ID from thumbnail element', videoIdExtraction);
    template = template.replace('// TODO: Implement logic to extract the video MP4 URL from the video page HTML', videoUrlExtraction);
    template = template.replace('// TODO: Implement logic to extract the video MP4 URL for download', videoUrlExtraction);
    template = template.replace('// TODO: Implement logic to mark current video as watched if on a video page', "
        const mediaPageRegex = /^\/video\/(\\d+)\/i;
        const match = window.location.pathname.match(mediaPageRegex);
        if (match) {
            await markVideoAsWatched(match[1]);
        }
    ");
    template = template.replace('// TODO: Implement favorite functionality if applicable for the website', "
        // This is a placeholder - actual favorite functionality would require site-specific implementation
        alert('Favorite functionality for ${websiteName} would require account integration.');
    ");
    template = template.replace('// TODO: Implement logic to set videoId dataset for each thumbnail if needed', "
        allThumbnails.forEach(thumb => {
            const link = thumb.querySelector('a');
            if (link) {
                const urlMatch = link.href.match(/\/video\/(\\d+)/);
                if (urlMatch && urlMatch[1]) {
                    thumb.dataset.videoId = urlMatch[1];
                }
            }
        });
    ");

    const outputPath = path.join('..', `${websiteName.toLowerCase()}.user.js`);
    await fs.writeFile(outputPath, template);
    console.log(`Userscript for ${websiteName} generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating userscript:', error.message);
  }
}

// Example usage (these would come from analysis in a real scenario)
// generateUserscript(
//   'NewSite',
//   'newsite.com',
//   '.video-thumbnail',
//   'return thumbnail.dataset.videoId || thumbnail.querySelector(\"a\").href.match(/\\/videos\\/(\\w+)/)[1]';
//   'const videoElement = doc.querySelector(\"video\"); if (videoElement) { videoMp4Url = videoElement.src; }'
// );

module.exports = generateUserscript;
