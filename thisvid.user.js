// ==UserScript==
// @name         ThisVid Download & Popup Buttons
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds a one-click download button and a popup video player to thumbnails on ThisVid.
// @author       You & Gemini
// @match        *://*.thisvid.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. Create Popup Player Elements ---
    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'tv-popup-overlay';
    popupOverlay.innerHTML = `
        <div id="tv-popup-container">
            <span id="tv-popup-close">&times;</span>
            <div id="tv-popup-content"></div>
        </div>
    `;
    document.body.appendChild(popupOverlay);

    const popupContent = document.getElementById('tv-popup-content');
    const popupCloseBtn = document.getElementById('tv-popup-close');

    // --- 2. Add CSS for Popup and Buttons ---
    const styles = `
        #tv-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.85); display: none;
            justify-content: center; align-items: center; z-index: 10000;
        }
        #tv-popup-container {
            position: relative; display: flex; justify-content: center; align-items: center;
        }
        #tv-popup-content video {
            display: block; max-width: 90vw; max-height: 90vh; width: auto; height: auto;
        }
        #tv-popup-close {
            position: absolute; top: -35px; right: -5px; font-size: 40px; color: white;
            cursor: pointer; font-family: sans-serif;
        }
        .tv-loader {
            border: 8px solid #f3f3f3; border-top: 8px solid #00adef; border-radius: 50%;
            width: 60px; height: 60px; animation: spin 1s linear infinite;
        }
        .tv-userscript-button {
            position: absolute;
            z-index: 999;
            width: 32px;
            height: 32px;
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 3px;
            cursor: pointer;
            background-color: rgba(0, 0, 0, 0.6);
            background-position: center;
            background-repeat: no-repeat;
            background-size: 20px;
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
    const thumbnailSelector = 'a.tumbpu';
    const thumbnails = document.querySelectorAll(thumbnailSelector);

    console.log(`[ThisVid Userscript] Found ${thumbnails.length} thumbnails.`);

    const popupIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-4a.5.5 0 0 1 1 0v4A2.5 2.5 0 0 1 12.5 15h-9A2.5 2.5 0 0 1 1 12.5v-9A2.5 2.5 0 0 1 3.5 1h4a.5.5 0 0 1 0 1h-4zM10.5 1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-2.793L6.354 6.854a.5.5 0 1 1-.708-.708L9.793 2H7.5a.5.5 0 0 1 0-1h3z"/></svg>';
    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
    const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" style="background:0 0"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="%23FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';

    thumbnails.forEach(thumbnail => {
        const thumbSpan = thumbnail.querySelector('.thumb');
        if (!thumbSpan) return;

        thumbSpan.style.position = 'relative';

        const popupButton = document.createElement('button');
        popupButton.className = 'tv-userscript-button';
        popupButton.style.top = '5px';
        popupButton.style.left = '5px';
        popupButton.style.backgroundImage = `url('${popupIconUrl}')`;
        thumbSpan.appendChild(popupButton);

        const downloadButton = document.createElement('button');
        downloadButton.className = 'tv-userscript-button';
        downloadButton.style.top = '5px';
        downloadButton.style.right = '5px';
        downloadButton.style.backgroundImage = `url('${downloadIconUrl}')`;
        thumbSpan.appendChild(downloadButton);

        const fetchVideoUrl = (callback) => {
            const videoPageUrl = thumbnail.href;
            GM_xmlhttpRequest({
                method: 'GET', url: videoPageUrl,
                onload: function(response) {
                    // --- KEY CHANGE HERE ---
                    // Target 'event_reporting2', which contains the direct, clean URL.
                    const match = response.responseText.match(/event_reporting2: '([^']+)'/);
                    if (match && match[1]) {
                        // Clean the URL by removing the trailing slash
                        const rawUrl = match[1];
                        const finalUrl = rawUrl.slice(0, -1);
                        callback(finalUrl);
                    } else {
                        callback(null, 'Could not find video source.');
                    }
                },
                onerror: function() {
                    callback(null, 'Failed to load video page.');
                }
            });
        };

        // --- POPUP BUTTON FUNCTIONALITY ---
        popupButton.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            popupContent.innerHTML = '<div class="tv-loader"></div>';
            popupOverlay.style.display = 'flex';

            fetchVideoUrl((url, error) => {
                if (url) {
                    popupContent.innerHTML = `<video src="${url}" controls autoplay loop></video>`;
                } else {
                    popupContent.innerText = `Error: ${error}`;
                }
            });
        });

        // --- DOWNLOAD BUTTON FUNCTIONALITY ---
        downloadButton.addEventListener('click', (event) => {
            event.preventDefault(); event.stopPropagation();
            downloadButton.style.backgroundImage = `url('${loadingIconUrl}')`;

            const videoTitle = thumbnail.title.trim().replace(/[\\/:*?"<>|]/g, '-') || 'video';

            fetchVideoUrl((url, error) => {
                if (url) {
                    const filename = `${videoTitle}.mp4`;
                    GM_download(url, filename);
                } else {
                    alert(`Error: ${error}`);
                }
                setTimeout(() => { downloadButton.style.backgroundImage = `url('${downloadIconUrl}')`; }, 500);
            });
        });
    });
})();
