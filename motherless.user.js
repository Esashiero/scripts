// ==UserScript==
// @name         Motherless Download & Popup Buttons
// @namespace    http://tampermonkey.net/
// @version      1.3
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

    // --- 1. Create Popup Player Elements (and hide them initially) ---
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

    // --- 2. Add CSS for the Popup Player ---
    const styles = `
        #ml-popup-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.85);
            display: none; /* Hidden by default */
            justify-content: center;
            align-items: center;
            z-index: 10000;
        }
        /* --- CSS CHANGES ARE HERE --- */
        #ml-popup-container {
            position: relative;
            /* Remove fixed sizing from container */
            display: flex;
            justify-content: center;
            align-items: center;
        }
        #ml-popup-content video {
            display: block;
            /* Apply constraints directly to the video */
            max-width: 90vw;   /* Use 90% of viewport width */
            max-height: 90vh;  /* Use 90% of viewport height */
            /* Ensure the video scales proportionally */
            width: auto;
            height: auto;
        }
        /* --- END OF CSS CHANGES --- */
        #ml-popup-close {
            position: absolute;
            top: -30px; right: 0;
            font-size: 35px;
            color: white;
            cursor: pointer;
            font-family: sans-serif;
        }
        .ml-loader {
            border: 8px solid #f3f3f3;
            border-top: 8px solid #3498db;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);


    // --- 3. Functions to control the Popup ---
    const closePopup = () => {
        popupOverlay.style.display = 'none';
        popupContent.innerHTML = ''; // Clear content to stop video
    };

    popupOverlay.addEventListener('click', (event) => {
        if (event.target === popupOverlay) {
            closePopup();
        }
    });
    popupCloseBtn.addEventListener('click', closePopup);


    // --- 4. Find all thumbnails and add buttons ---
    const thumbnailSelector = '.mobile-thumb';
    const thumbnails = document.querySelectorAll(thumbnailSelector);

    console.log(`[Motherless Userscript] Found ${thumbnails.length} thumbnails.`);

    const popupIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-4a.5.5 0 0 1 1 0v4A2.5 2.5 0 0 1 12.5 15h-9A2.5 2.5 0 0 1 1 12.5v-9A2.5 2.5 0 0 1 3.5 1h4a.5.5 0 0 1 0 1h-4zM10.5 1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-2.793L6.354 6.854a.5.5 0 1 1-.708-.708L9.793 2H7.5a.5.5 0 0 1 0-1h3z"/></svg>';
    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';

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

        // --- POPUP BUTTON FUNCTIONALITY ---
        popupButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            popupContent.innerHTML = '<div class="ml-loader"></div>';
            popupOverlay.style.display = 'flex';

            const codename = thumbnail.dataset.codename;
            const videoPageUrl = thumbnail.querySelector('a.img-container').href;

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
                        const finalUrl = baseUrl.replace(/&amp;/g, '&');
                        popupContent.innerHTML = `<video src="${finalUrl}" controls autoplay loop></video>`;
                    } else {
                        popupContent.innerText = 'Error: Could not find video source.';
                    }
                },
                onerror: function() {
                    popupContent.innerText = 'Error: Failed to load video page.';
                }
            });
        });


        // --- DOWNLOAD BUTTON FUNCTIONALITY (Unchanged) ---
        downloadButton.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            const codename = thumbnail.dataset.codename;
            const videoPageUrl = thumbnail.querySelector('a.img-container').href;
            downloadButton.disabled = true;

            GM_xmlhttpRequest({
                method: 'GET',
                url: videoPageUrl,
                onload: function(response) {
                    const htmlText = response.responseText;
                    let baseUrl = null;
                    const hdRegex = new RegExp(`(https?://[^/]+/videos/${codename}-720p\\.mp4[^"']*)`);
                    if (htmlText.match(hdRegex)) baseUrl = htmlText.match(hdRegex)[0];
                    else {
                        const sdRegex = new RegExp(`(https?://[^/]+/videos/${codename}\\.mp4[^"']*)`);
                        if (htmlText.match(sdRegex)) baseUrl = htmlText.match(sdRegex)[0];
                    }

                    if (baseUrl) {
                        let finalUrl = baseUrl.replace(/&amp;/g, '&');
                        finalUrl += "&download&cd=attachment&d=1";
                        GM_download(finalUrl, `${codename}.mp4`);
                    } else {
                        alert('Could not find any direct video URL on the page.');
                    }
                    downloadButton.disabled = false;
                },
                onerror: function() {
                    alert('An error occurred while fetching the video page.');
                    downloadButton.disabled = false;
                }
            });
        });
    });
})();