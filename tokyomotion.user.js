// ==UserScript==
// @name         TokyoMotion Download & Popup Buttons
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds download/favorite/zoom buttons to video thumbnails and a popup player. Tracks and dims watched videos.
// @author       You & Gemini
// @match        *://*.tokyomotion.net/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/tokyomotion.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/tokyomotion.user.js

// ==/UserScript==

(function() {
    'use strict';

    let allThumbnails = [];
    let currentIndex = -1;
    const originalPageTitle = document.title;
    let watchedVideos = new Set();

    const pageLinkIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5-.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>';
    const zoomIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M5.5 2.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zm-6.5 5a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H4z"/></svg>';

    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'tm-popup-overlay';
    popupOverlay.innerHTML = `
        <div id="tm-popup-container">
            <div id="tm-popup-content"></div>
            <div id="tm-popup-title"></div>
        </div>
        <div id="tm-popup-top-buttons">
            <a id="tm-popup-pagelink" href="#" target="_blank" title="Open Video Page"></a>
            <a id="tm-popup-zoom" title="Toggle Aspect Ratio"></a>
        </div>
        <span id="tm-popup-close" title="Close">&times;</span>
        <div id="tm-popup-prev" class="tm-popup-nav"><span>&lsaquo;</span></div>
        <div id="tm-popup-next" class="tm-popup-nav"><span>&rsaquo;</span></div>
    `;
    document.body.appendChild(popupOverlay);

    const popupContent = document.getElementById('tm-popup-content');
    const popupTitle = document.getElementById('tm-popup-title');
    const popupCloseBtn = document.getElementById('tm-popup-close');
    const pageLinkBtn = document.getElementById('tm-popup-pagelink');
    const zoomBtn = document.getElementById('tm-popup-zoom');
    const prevBtn = document.getElementById('tm-popup-prev');
    const nextBtn = document.getElementById('tm-popup-next');

    const styles = `
        .well.well-sm { cursor: pointer; }
        #tm-popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.9); display: none; justify-content: center; align-items: center; z-index: 10000; }
        #tm-popup-container { display: flex; flex-direction: column; justify-content: center; align-items: center; }
        #tm-popup-content video { display: block; width: auto; height: auto; max-width: 95vw; max-height: 85vh; transition: all 0.2s ease-in-out; }
        #tm-popup-content.zoom-active video { width: 100vw; height: 85vh; object-fit: cover; }
        #tm-popup-title { color: white; text-align: center; margin-top: 10px; max-width: 80vw; font-size: 16px; font-family: sans-serif; }
        #tm-popup-close { position: absolute; top: 10px; right: 10px; color: white; cursor: pointer; text-shadow: 0 0 5px black; opacity: 0.7; transition: opacity 0.2s; z-index: 10001; font-size: 40px; font-family: sans-serif; }
        #tm-popup-top-buttons { position: absolute; top: 10px; left: 10px; display: flex; gap: 15px; z-index: 10001; }
        #tm-popup-top-buttons a { width: 28px; height: 28px; display: block; cursor: pointer; opacity: 0.7; transition: all 0.2s; }
        #tm-popup-pagelink { background: url('${pageLinkIconUrl}') center / contain no-repeat; }
        #tm-popup-zoom { background: url('${zoomIconUrl}') center / contain no-repeat; }
        .tm-popup-nav { position: absolute; top: 50%; transform: translateY(-50%); height: auto; width: auto; z-index: 10001; display: flex; align-items: center; color: white; cursor: pointer; user-select: none; opacity: 0.7; transition: opacity 0.2s; }
        #tm-popup-overlay:hover .tm-popup-nav, #tm-popup-overlay:hover #tm-popup-close, #tm-popup-overlay:hover #tm-popup-top-buttons a { opacity: 1; }
        #tm-popup-top-buttons a:hover, .tm-popup-nav:hover, #tm-popup-close:hover { opacity: 1; transform: scale(1.1); }
        #tm-popup-prev { left: 5px; } #tm-popup-next { right: 5px; }
        .tm-popup-nav span { font-size: 60px; font-weight: bold; font-family: sans-serif; padding: 20px 10px; text-shadow: 0 0 8px black; }
        .tm-loader { border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .thumb-watched { opacity: 0.5; transition: opacity 0.3s ease; }
        .thumb-watched:hover { opacity: 1; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const loadWatchedVideos = async () => {
        const watchedArray = JSON.parse(await GM_getValue('tm_watched_videos', '[]'));
        watchedVideos = new Set(watchedArray);
    };
    const markVideoAsWatched = async (videoId) => {
        if (videoId && !watchedVideos.has(videoId)) {
            watchedVideos.add(videoId);
            await GM_setValue('tm_watched_videos', JSON.stringify(Array.from(watchedVideos)));
        }
    };
    const applyWatchedStyles = () => {
        allThumbnails.forEach(thumb => {
            if (thumb.dataset.videoId && watchedVideos.has(thumb.dataset.videoId)) {
                thumb.classList.add('thumb-watched');
            }
        });
    };

    const openPopupPlayer = (index) => {
        if (index < 0 || index >= allThumbnails.length) return;
        currentIndex = index;
        const thumbnail = allThumbnails[index];
        const videoId = thumbnail.dataset.videoId;
        const videoPageUrl = thumbnail.querySelector('a.thumb-popu').href;

        markVideoAsWatched(videoId);
        thumbnail.classList.add('thumb-watched');

        pageLinkBtn.href = videoPageUrl;
        popupContent.classList.remove('zoom-active');
        const titleElement = thumbnail.querySelector('.video-title');
        document.title = titleElement ? titleElement.innerText.trim() : 'TokyoMotion';
        popupTitle.innerText = titleElement ? titleElement.innerText.trim() : '';

        popupContent.innerHTML = '<div class="tm-loader"></div>';
        popupOverlay.style.display = 'flex';

        // --- STAGE 1: Get the video page ---
        GM_xmlhttpRequest({
            method: 'GET', url: videoPageUrl,
            onload: function(response) {
                // Use DOMParser to safely parse the returned HTML text
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, "text/html");
                const sourceElement = doc.querySelector('#vjsplayer source');

                if (sourceElement && sourceElement.src) {
                    const redirectUrl = sourceElement.src;

                    // --- STAGE 2: Get the redirect URL which is the REAL MP4 link ---
                    GM_xmlhttpRequest({
                        method: 'GET', url: redirectUrl,
                        onload: function(videoResponse) {
                            const finalUrl = videoResponse.finalUrl; // <-- This is the magic property!
                            popupContent.innerHTML = `<video src="${finalUrl}" controls autoplay loop></video>`;
                        },
                        onerror: function() {
                            popupContent.innerText = 'Error: Failed to resolve video redirect.';
                        }
                    });
                } else {
                    popupContent.innerText = 'Error: Could not find the initial <source> element.';
                }
            },
            onerror: function() { popupContent.innerText = 'Error: Failed to load video page.'; }
        });
    };

    const closePopup = () => {
        popupOverlay.style.display = 'none';
        popupContent.innerHTML = '';
        popupTitle.innerText = '';
        pageLinkBtn.href = '#';
        currentIndex = -1;
        document.title = originalPageTitle;
    };
    const toggleZoom = () => popupContent.classList.toggle('zoom-active');

    popupOverlay.addEventListener('click', (event) => { if (event.target === popupOverlay) closePopup(); });
    popupCloseBtn.addEventListener('click', closePopup);
    prevBtn.addEventListener('click', () => openPopupPlayer(currentIndex - 1));
    nextBtn.addEventListener('click', () => openPopupPlayer(currentIndex + 1));
    zoomBtn.addEventListener('click', toggleZoom);

    async function initializeScript() {
        await loadWatchedVideos();

        const mediaPageRegex = /^\/video\/(\d+)\//i;
        const match = window.location.pathname.match(mediaPageRegex);
        if (match) {
            await markVideoAsWatched(match[1]);
        }

        const thumbnailSelector = '.well.well-sm';
        allThumbnails = Array.from(document.querySelectorAll(thumbnailSelector));

        allThumbnails.forEach(thumb => {
            const link = thumb.querySelector('a.thumb-popu');
            if (link) {
                const urlMatch = link.href.match(/\/video\/(\d+)\//);
                if (urlMatch && urlMatch[1]) {
                    thumb.dataset.videoId = urlMatch[1];
                }
            }
        });

        applyWatchedStyles();

        const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
        const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" style="background:0 0"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="%23FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';

        allThumbnails.forEach((thumbnail, index) => {
            const buttonContainer = thumbnail.querySelector('.thumb-overlay');
            if (!buttonContainer) return;
            buttonContainer.style.position = 'relative';

            const downloadButton = document.createElement('button');
            downloadButton.style.cssText = `position: absolute; top: 5px; right: 5px; z-index: 100; width: 32px; height: 32px; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 3px; cursor: pointer; background: rgba(0, 0, 0, 0.6) url('${downloadIconUrl}') center / 20px no-repeat;`;
            buttonContainer.appendChild(downloadButton);

            thumbnail.addEventListener('click', (event) => {
                if (downloadButton.contains(event.target)) return;
                event.preventDefault();
                event.stopPropagation();
                openPopupPlayer(index);
            });

            downloadButton.addEventListener('click', (event) => {
                event.preventDefault(); event.stopPropagation();
                const videoPageUrl = thumbnail.querySelector('a.thumb-popu').href;
                downloadButton.style.backgroundImage = `url("${loadingIconUrl}")`;

                // The same 2-stage logic is needed for the download button
                GM_xmlhttpRequest({
                    method: 'GET', url: videoPageUrl,
                    onload: function(response) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, "text/html");
                        const sourceElement = doc.querySelector('#vjsplayer source');
                        if (sourceElement && sourceElement.src) {
                            GM_xmlhttpRequest({
                                method: 'GET', url: sourceElement.src,
                                onload: function(videoResponse) {
                                    window.open(videoResponse.finalUrl, '_blank');
                                    setTimeout(() => { downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`; }, 500);
                                },
                                onerror: function() {
                                    alert('An error occurred while resolving the video URL.');
                                    downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                                }
                            });
                        } else {
                            alert('Could not find the initial video source for download.');
                            downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                        }
                    },
                    onerror: function() {
                        alert('An error occurred while fetching the video page.');
                        downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                    }
                });
            });
        });
    }

    initializeScript();

})();
