// ==UserScript==
// @name         Motherless Download & Popup Buttons (Final)
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a functional, one-click download button and a popup button to all thumbnails.
// @author       You & Gemini
// @match        *://*.motherless.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    const thumbnailSelector = '.mobile-thumb';
    const thumbnails = document.querySelectorAll(thumbnailSelector);

    console.log(`[Motherless Userscript] Found ${thumbnails.length} thumbnails.`);

    const popupIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-4a.5.5 0 0 1 1 0v4A2.5 2.5 0 0 1 12.5 15h-9A2.5 2.5 0 0 1 1 12.5v-9A2.5 2.5 0 0 1 3.5 1h4a.5.5 0 0 1 0 1h-4zM10.5 1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-2.793L6.354 6.854a.5.5 0 1 1-.708-.708L9.793 2H7.5a.5.5 0 0 1 0-1h3z"/></svg>';
    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
    const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" style="background:0 0"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="%23FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';

    thumbnails.forEach(thumbnail => {
        const innerContainer = thumbnail.querySelector('.mobile-thumb-inner');
        if (!innerContainer) return;

        innerContainer.style.position = 'relative';

        const popupButton = document.createElement('button');
        popupButton.style.cssText = `position: absolute; top: 5px; left: 5px; z-index: 9999; width: 24px; height: 24px; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 3px; cursor: pointer; background: rgba(0, 0, 0, 0.6) url('${popupIconUrl}') center / 16px no-repeat;`;
        innerContainer.appendChild(popupButton);

        const downloadButton = document.createElement('button');
        downloadButton.style.cssText = `position: absolute; top: 5px; right: 5px; z-index: 9999; width: 24px; height: 24px; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 3px; cursor: pointer; background: rgba(0, 0, 0, 0.6) url('${downloadIconUrl}') center / 16px no-repeat;`;
        innerContainer.appendChild(downloadButton);

        // We will make the popup button work in the next step.
        // For now, it opens Google.
        popupButton.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            window.open('https://www.google.com', '_blank');
        });

        downloadButton.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();

            const codename = thumbnail.dataset.codename;
            const videoPageUrl = thumbnail.querySelector('a.img-container').href;

            if (!videoPageUrl || !codename) {
                alert('Could not find video page link or codename.');
                return;
            }

            downloadButton.style.backgroundImage = `url("${loadingIconUrl}")`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: videoPageUrl,
                onload: function(response) {
                    const htmlText = response.responseText;
                    let baseUrl = null;

                    const hdRegex = new RegExp(`(https?://[^/]+/videos/${codename}-720p\\.mp4[^"']*)`);
                    const hdMatch = htmlText.match(hdRegex);

                    if (hdMatch && hdMatch[0]) {
                        baseUrl = hdMatch[0];
                    } else {
                        const sdRegex = new RegExp(`(https?://[^/]+/videos/${codename}\\.mp4[^"']*)`);
                        const sdMatch = htmlText.match(sdRegex);
                        if (sdMatch && sdMatch[0]) {
                            baseUrl = sdMatch[0];
                        }
                    }

                    if (baseUrl) {
                        // Clean up the URL and append the magic download parameters
                        let finalUrl = baseUrl.replace(/&amp;/g, '&');
                        finalUrl += "&download&cd=attachment&d=1";

                        const filename = `${codename}.mp4`;

                        console.log(`Triggering GM_download for: ${finalUrl}`);
                        GM_download(finalUrl, filename);

                    } else {
                        alert('Could not find any direct video URL on the page.');
                    }

                    downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                },
                onerror: function(response) {
                    alert(`An error occurred while fetching the video page. Status: ${response.status}`);
                    downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                }
            });
        });
    });
})();
