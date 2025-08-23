// ==UserScript==
// @name         Motherless Download & Popup Buttons
// @namespace    http://tampermonkey.net/
// @version      1.7
// @description  Adds a functional, one-click download button and a popup video player to all thumbnails.
// @author       You & Gemini
// @match        *://*.motherless.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/motherless.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/motherless.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. Create Popup Player Elements ---
    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'ml-popup-overlay';
    popupOverlay.innerHTML = `
        <div id="ml-popup-container">
            <span id="ml-popup-close">&times;</span>
            <div id="ml-popup-content"></div>
        </div>
    `;
    document.body.appendChild(popupOverlay);

    const popupContent = document.getElementById('ml-popup-content');
    const popupCloseBtn = document.getElementById('ml-popup-close');

    // --- 2. Add CSS ---
    const styles = `
        #ml-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.85); display: none;
            justify-content: center; align-items: center; z-index: 10000;
        }
        #ml-popup-container {
            position: relative; display: flex; justify-content: center; align-items: center;
        }
        #ml-popup-content video {
            display: block; max-width: 90vw; max-height: 90vh; width: auto; height: auto;
        }
        #ml-popup-close {
            position: absolute; top: -35px; right: -5px; font-size: 40px; color: white;
            cursor: pointer; font-family: sans-serif;
        }
        .ml-loader {
            border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%;
            width: 60px; height: 60px; animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);


    // --- 3. Popup Control Functions ---
    const closePopup = () => {
        popupOverlay.style.display = 'none';
        popupContent.innerHTML = '';
    };
    popupOverlay.addEventListener('click', (event) => { if (event.target === popupOverlay) closePopup(); });
    popupCloseBtn.addEventListener('click', closePopup);


    // --- 4. Find Thumbnails and Add Buttons ---
    const thumbnailSelector = '.mobile-thumb';
    const thumbnails = document.querySelectorAll(thumbnailSelector);

    const popupIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-4a.5.5 0 0 1 1 0v4A2.5 2.5 0 0 1 12.5 15h-9A2.5 2.5 0 0 1 1 12.5v-9A2.5 2.5 0 0 1 3.5 1h4a.5.5 0 0 1 0 1h-4zM10.5 1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-2.793L6.354 6.854a.5.5 0 1 1-.708-.708L9.793 2H7.5a.5.5 0 0 1 0-1h3z"/></svg>';
    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
    const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" style="background:0 0"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="%23FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';


    thumbnails.forEach(thumbnail => {
        const innerContainer = thumbnail.querySelector('.mobile-thumb-inner');
        if (!innerContainer) return;
        innerContainer.style.position = 'relative';

        // User-requested button size
        const buttonSize = '32px';
        const iconSize = '20px';

        const popupButton = document.createElement('button');
        popupButton.style.cssText = `position: absolute; top: 5px; left: 5px; z-index: 9999; width: ${buttonSize}; height: ${buttonSize}; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 3px; cursor: pointer; background: rgba(0, 0, 0, 0.6) url('${popupIconUrl}') center / ${iconSize} no-repeat;`;
        innerContainer.appendChild(popupButton);

        const downloadButton = document.createElement('button');
        downloadButton.style.cssText = `position: absolute; top: 5px; right: 5px; z-index: 9999; width: ${buttonSize}; height: ${buttonSize}; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 3px; cursor: pointer; background: rgba(0, 0, 0, 0.6) url('${downloadIconUrl}') center / ${iconSize} no-repeat;`;
        innerContainer.appendChild(downloadButton);

        // --- POPUP BUTTON FUNCTIONALITY ---
        popupButton.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            popupContent.innerHTML = '<div class="ml-loader"></div>';
            popupOverlay.style.display = 'flex';
            const codename = thumbnail.dataset.codename;
            const videoPageUrl = thumbnail.querySelector('a.img-container').href;

            GM_xmlhttpRequest({
                method: 'GET', url: videoPageUrl,
                onload: function(response) {
                    const htmlText = response.responseText;
                    let baseUrl = null;
                    const hdRegex = new RegExp(`(https?://[^/]+/videos/${codename}-720p\\.mp4[^"']*)`);
                    const hdMatch = htmlText.match(hdRegex);
                    if (hdMatch && hdMatch[0]) { baseUrl = hdMatch[0]; }
                    else {
                        const sdRegex = new RegExp(`(https?://[^/]+/videos/${codename}\\.mp4[^"']*)`);
                        const sdMatch = htmlText.match(sdRegex);
                        if (sdMatch && sdMatch[0]) { baseUrl = sdMatch[0]; }
                    }

                    if (baseUrl) {
                        const finalUrl = baseUrl.replace(/&amp;/g, '&');
                        popupContent.innerHTML = `<video src="${finalUrl}" controls autoplay loop></video>`;
                    } else { popupContent.innerText = 'Error: Could not find video source.'; }
                },
                onerror: function() { popupContent.innerText = 'Error: Failed to load video page.'; }
            });
        });

        // --- DOWNLOAD BUTTON FUNCTIONALITY (WITH CUSTOM FILENAME) ---
        downloadButton.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            const codename = thumbnail.dataset.codename;
            const videoPageUrl = thumbnail.querySelector('a.img-container').href;
            downloadButton.style.backgroundImage = `url("${loadingIconUrl}")`;

            // --- NEW: Get and sanitize the video title ---
            let videoTitle = 'video'; // Default title
            const titleElement = thumbnail.querySelector('.thumb-title .title');
            if (titleElement) {
                // Replace characters that are invalid in filenames
                videoTitle = titleElement.innerText.trim().replace(/[\\/:*?"<>|]/g, '-');
            }

            GM_xmlhttpRequest({
                method: 'GET', url: videoPageUrl,
                onload: function(response) {
                    const htmlText = response.responseText;
                    let baseUrl = null;
                    const hdRegex = new RegExp(`(https?://[^/]+/videos/${codename}-720p\\.mp4[^"']*)`);
                    const hdMatch = htmlText.match(hdRegex);
                    if (hdMatch && hdMatch[0]) { baseUrl = hdMatch[0]; }
                    else {
                        const sdRegex = new RegExp(`(https?://[^/]+/videos/${codename}\\.mp4[^"']*)`);
                        const sdMatch = htmlText.match(sdRegex);
                        if (sdMatch && sdMatch[0]) { baseUrl = sdMatch[0]; }
                    }

                    if (baseUrl) {
                        let finalUrl = baseUrl.replace(/&amp;/g, '&');
                        finalUrl += "&download&cd=attachment&d=1";

                        // --- NEW: Construct the full filename ---
                        const filename = `${videoTitle} - ${codename}.mp4`;

                        // --- Use GM_download to set the custom filename ---
                        GM_download(finalUrl, filename);

                    } else { alert('Could not find any direct video URL on the page.'); }

                    setTimeout(() => {
                        downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                    }, 500);
                },
                onerror: function() {
                    alert('An error occurred while fetching the video page.');
                    downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                }
            });
        });
    });
})();