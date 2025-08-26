// ==UserScript==
// @name         Motherless Download & Popup Buttons
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Adds a download button and makes thumbnails open a popup player with slideshow controls.
// @author       You & Gemini
// @match        *://*.motherless.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/motherless.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/motherless.user.js
// ==/UserScript==

(function() {
    'use strict';

    // --- NEW: Global variables for slideshow state ---
    let allThumbnails = []; // Will hold all thumbnail elements from the page
    let currentIndex = -1; // Will track the currently playing video's index

    // --- 1. Create Popup Player Elements ---
    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'ml-popup-overlay';
    // Add new arrow buttons to the HTML structure
    popupOverlay.innerHTML = `
        <span id="ml-popup-prev" class="ml-popup-nav">&lsaquo;</span>
        <div id="ml-popup-container">
            <span id="ml-popup-close">&times;</span>
            <div id="ml-popup-content"></div>
        </div>
        <span id="ml-popup-next" class="ml-popup-nav">&rsaquo;</span>
    `;
    document.body.appendChild(popupOverlay);

    const popupContent = document.getElementById('ml-popup-content');
    const popupCloseBtn = document.getElementById('ml-popup-close');
    const prevBtn = document.getElementById('ml-popup-prev');
    const nextBtn = document.getElementById('ml-popup-next');

    // --- 2. Add CSS ---
    const styles = `
        .mobile-thumb { cursor: pointer; }
        #ml-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.9); display: none;
            justify-content: space-between; align-items: center; z-index: 10000;
        }
        #ml-popup-container {
            position: relative; display: flex; justify-content: center; align-items: center;
        }
        #ml-popup-content video {
            display: block; max-width: 85vw; max-height: 90vh; width: auto; height: auto;
        }
        #ml-popup-close {
            position: absolute; top: -35px; right: -5px; font-size: 40px; color: white;
            cursor: pointer; font-family: sans-serif;
        }
        .ml-popup-nav { /* Style for the new Next/Prev buttons */
            color: white; font-size: 60px; font-weight: bold; cursor: pointer;
            padding: 0 15px; user-select: none; font-family: sans-serif;
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


    // --- 3. The Core Function to Open a Video in the Popup ---
    // This function is now the heart of the player.
    const openPopupPlayer = (index) => {
        if (index < 0 || index >= allThumbnails.length) {
            return; // Don't do anything if we're at the beginning or end
        }

        currentIndex = index; // Update the global index

        const thumbnail = allThumbnails[index];
        const codename = thumbnail.dataset.codename;
        const videoPageUrl = thumbnail.querySelector('a.img-container').href;

        // Show popup with a loading spinner
        popupContent.innerHTML = '<div class="ml-loader"></div>';
        popupOverlay.style.display = 'flex';

        // Fetch the video URL
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
    };


    // --- 4. Popup Control Functions ---
    const closePopup = () => {
        popupOverlay.style.display = 'none';
        popupContent.innerHTML = ''; // This stops the video
        currentIndex = -1; // Reset index
    };
    popupOverlay.addEventListener('click', (event) => { if (event.target === popupOverlay) closePopup(); });
    popupCloseBtn.addEventListener('click', closePopup);
    prevBtn.addEventListener('click', () => openPopupPlayer(currentIndex - 1));
    nextBtn.addEventListener('click', () => openPopupPlayer(currentIndex + 1));


    // --- 5. Find Thumbnails, Build the Global List, and Add Listeners ---
    const thumbnailSelector = '.mobile-thumb';
    // Use Array.from to create a static copy
    allThumbnails = Array.from(document.querySelectorAll(thumbnailSelector));

    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
    const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" style="background:0 0"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="%23FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';

    allThumbnails.forEach((thumbnail, index) => {
        const innerContainer = thumbnail.querySelector('.mobile-thumb-inner');
        if (!innerContainer) return;
        innerContainer.style.position = 'relative';

        const buttonSize = '32px';
        const iconSize = '20px';

        const downloadButton = document.createElement('button');
        downloadButton.style.cssText = `position: absolute; top: 5px; right: 5px; z-index: 9999; width: ${buttonSize}; height: ${buttonSize}; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 3px; cursor: pointer; background: rgba(0, 0, 0, 0.6) url('${downloadIconUrl}') center / ${iconSize} no-repeat;`;
        innerContainer.appendChild(downloadButton);

        // --- POPUP FUNCTIONALITY ON THE ENTIRE THUMBNAIL ---
        thumbnail.addEventListener('click', (event) => {
            if (downloadButton.contains(event.target)) { return; }
            event.preventDefault();
            event.stopPropagation();
            openPopupPlayer(index); // Call the main player function with this thumbnail's index
        });

        // --- DOWNLOAD BUTTON FUNCTIONALITY ---
        downloadButton.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            const codename = thumbnail.dataset.codename;
            const videoPageUrl = thumbnail.querySelector('a.img-container').href;
            downloadButton.style.backgroundImage = `url("${loadingIconUrl}")`;

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
                        window.open(finalUrl, '_blank');
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