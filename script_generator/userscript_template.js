// ==UserScript==
// @name         {{WEBSITE_NAME}} Download & Popup Buttons
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds download/favorite/zoom buttons to video thumbnails and a popup player. Tracks and dims watched videos.
// @author       You & Gemini
// @match        *://*.{{MATCH_URL}}/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/{{WEBSITE_NAME}}.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/{{WEBSITE_NAME}}.user.js
// ==/UserScript==

(function() {
    'use strict';

    let allThumbnails = [];
    let currentIndex = -1;
    const originalPageTitle = document.title;
    let watchedVideos = new Set();

    const pageLinkIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5-.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>';
    const favoriteIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/></svg>';
    const zoomIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M5.5 2.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zm-6.5 5a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H4z"/></svg>';
    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
    const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" style="background:0 0"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="%23FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';

    const popupOverlay = document.createElement('div');
    popupOverlay.id = '{{PREFIX}}-popup-overlay';
    popupOverlay.innerHTML = `
        <div id="{{PREFIX}}-popup-container">
            <div id="{{PREFIX}}-popup-content"></div>
            <div id="{{PREFIX}}-popup-title"></div>
        </div>
        <div id="{{PREFIX}}-popup-top-buttons">
            <a id="{{PREFIX}}-popup-pagelink" href="#" target="_blank" title="Open Video Page"></a>
            <a id="{{PREFIX}}-popup-favorite" title="Add to Favorites"></a>
            <a id="{{PREFIX}}-popup-zoom" title="Toggle Aspect Ratio"></a>
        </div>
        <span id="{{PREFIX}}-popup-close" title="Close">&times;</span>
        <div id="{{PREFIX}}-popup-prev" class="{{PREFIX}}-popup-nav"><span>&lsaquo;</span></div>
        <div id="{{PREFIX}}-popup-next" class="{{PREFIX}}-popup-nav"><span>&rsaquo;</span></div>
    `;
    document.body.appendChild(popupOverlay);

    const popupContent = document.getElementById('{{PREFIX}}-popup-content');
    const popupTitle = document.getElementById('{{PREFIX}}-popup-title');
    const popupCloseBtn = document.getElementById('{{PREFIX}}-popup-close');
    const pageLinkBtn = document.getElementById('{{PREFIX}}-popup-pagelink');
    const favoriteBtn = document.getElementById('{{PREFIX}}-popup-favorite');
    const zoomBtn = document.getElementById('{{PREFIX}}-popup-zoom');
    const prevBtn = document.getElementById('{{PREFIX}}-popup-prev');
    const nextBtn = document.getElementById('{{PREFIX}}-popup-next');

    const styles = `
        {{THUMBNAIL_SELECTOR}} { cursor: pointer; }
        #{{PREFIX}}-popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.9); display: none; justify-content: center; align-items: center; z-index: 10000; }
        #{{PREFIX}}-popup-container { display: flex; flex-direction: column; justify-content: center; align-items: center; }
        #{{PREFIX}}-popup-content video { display: block; width: auto; height: auto; max-width: 95vw; max-height: 85vh; transition: all 0.2s ease-in-out; }
        #{{PREFIX}}-popup-content.zoom-active video { width: 100vw; height: 85vh; object-fit: cover; }
        #{{PREFIX}}-popup-title { color: white; text-align: center; margin-top: 10px; max-width: 80vw; font-size: 16px; font-family: sans-serif; }
        #{{PREFIX}}-popup-close { position: absolute; top: 10px; right: 10px; color: white; cursor: pointer; text-shadow: 0 0 5px black; opacity: 0.7; transition: opacity 0.2s; z-index: 10001; font-size: 40px; font-family: sans-serif; }
        #{{PREFIX}}-popup-top-buttons { position: absolute; top: 10px; left: 10px; display: flex; gap: 15px; z-index: 10001; }
        #{{PREFIX}}-popup-top-buttons a { width: 28px; height: 28px; display: block; cursor: pointer; opacity: 0.7; transition: all 0.2s; }
        #{{PREFIX}}-popup-pagelink { background: url('${pageLinkIconUrl}') center / contain no-repeat; }
        #{{PREFIX}}-popup-favorite { background: url('${favoriteIconUrl}') center / contain no-repeat; }
        #{{PREFIX}}-popup-zoom { background: url('${zoomIconUrl}') center / contain no-repeat; }
        #{{PREFIX}}-popup-favorite.favorited { filter: drop-shadow(0 0 3px #ff4d4d) drop-shadow(0 0 8px #ff4d4d); opacity: 1 !important; }
        .{{PREFIX}}-popup-nav { position: absolute; top: 50%; transform: translateY(-50%); height: auto; width: auto; z-index: 10001; display: flex; align-items: center; color: white; cursor: pointer; user-select: none; opacity: 0.7; transition: opacity 0.2s; }
        #{{PREFIX}}-popup-overlay:hover .{{PREFIX}}-popup-nav, #{{PREFIX}}-popup-overlay:hover #{{PREFIX}}-popup-close, #{{PREFIX}}-popup-overlay:hover #{{PREFIX}}-popup-top-buttons a { opacity: 1; }
        #{{PREFIX}}-popup-top-buttons a:hover, .{{PREFIX}}-popup-nav:hover, #{{PREFIX}}-popup-close:hover { opacity: 1; transform: scale(1.1); }
        #{{PREFIX}}-popup-prev { left: 5px; } #{{PREFIX}}-popup-next { right: 5px; }
        .{{PREFIX}}-popup-nav span { font-size: 60px; font-weight: bold; font-family: sans-serif; padding: 20px 10px; text-shadow: 0 0 8px black; }
        #{{PREFIX}}-popup-content video::-webkit-media-controls-overlay-play-button { opacity: 0 !important; }
        .{{PREFIX}}-loader { border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .thumb-watched { opacity: 0.5; transition: opacity 0.3s ease; }
        .thumb-watched:hover { opacity: 1; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const loadWatchedVideos = async () => {
        const watchedArray = JSON.parse(await GM_getValue('{{PREFIX}}_watched_videos', '[]'));
        watchedVideos = new Set(watchedArray);
    };
    const markVideoAsWatched = async (videoId) => {
        if (videoId && !watchedVideos.has(videoId)) {
            watchedVideos.add(videoId);
            await GM_setValue('{{PREFIX}}_watched_videos', JSON.stringify(Array.from(watchedVideos)));
        }
    };
    const applyWatchedStyles = () => {
        allThumbnails.forEach(thumb => {
            if (thumb.dataset.videoId && watchedVideos.has(thumb.dataset.videoId)) {
                thumb.classList.add('thumb-watched');
            }
        });
    };

    const getVideoIdFromThumbnail = (thumbnail) => {
        // TODO: Implement logic to extract video ID from thumbnail element
        // This will be specific to each website.
        // Example: return thumbnail.dataset.videoId || thumbnail.querySelector('a').href.match(/\/video\/(\d+)/)[1];
        return null;
    };

    const openPopupPlayer = (index) => {
        if (index < 0 || index >= allThumbnails.length) return;
        currentIndex = index;
        const thumbnail = allThumbnails[index];
        const videoId = getVideoIdFromThumbnail(thumbnail);
        const videoPageUrl = thumbnail.querySelector('a').href; // Assuming the thumbnail is a link to the video page

        markVideoAsWatched(videoId);
        thumbnail.classList.add('thumb-watched');

        pageLinkBtn.href = videoPageUrl;
        popupContent.classList.remove('zoom-active');
        const titleElement = thumbnail.querySelector('.video-title'); // Assuming video title is in an element with class 'video-title'
        document.title = titleElement ? titleElement.innerText.trim() : '{{WEBSITE_NAME}}';
        popupTitle.innerText = titleElement ? titleElement.innerText.trim() : '';

        popupContent.innerHTML = '<div class="{{PREFIX}}-loader"></div>';
        popupOverlay.style.display = 'flex';

        GM_xmlhttpRequest({
            method: 'GET', url: videoPageUrl,
            onload: function(response) {
                const parser = new DOMParser();
                const doc = parser.parseFromString(response.responseText, "text/html");
                
                // TODO: Implement logic to extract the video MP4 URL from the video page HTML
                // This will be specific to each website.
                let videoMp4Url = null;
                // Example: const sourceElement = doc.querySelector('#vjsplayer source');
                // if (sourceElement && sourceElement.src) { videoMp4Url = sourceElement.src; }

                if (videoMp4Url) {
                    popupContent.innerHTML = `<video src="${videoMp4Url}" controls autoplay loop></video>`;
                } else {
                    popupContent.innerText = 'Error: Could not find video source.';
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
    const toggleFavorite = () => {
        // TODO: Implement favorite functionality if applicable for the website
        alert('Favorite functionality not implemented for {{WEBSITE_NAME}}.');
    };
    const toggleZoom = () => popupContent.classList.toggle('zoom-active');

    popupOverlay.addEventListener('click', (event) => { if (event.target === popupOverlay) closePopup(); });
    popupCloseBtn.addEventListener('click', closePopup);
    prevBtn.addEventListener('click', () => openPopupPlayer(currentIndex - 1));
    nextBtn.addEventListener('click', () => openPopupPlayer(currentIndex + 1));
    favoriteBtn.addEventListener('click', toggleFavorite);
    zoomBtn.addEventListener('click', toggleZoom);

    async function initializeScript() {
        await loadWatchedVideos();

        // TODO: Implement logic to mark current video as watched if on a video page
        // This will be specific to each website.
        // Example: const mediaPageRegex = /^\/video\/(\d+)\//i;
        // const match = window.location.pathname.match(mediaPageRegex);
        // if (match) { await markVideoAsWatched(match[1]); }

        const thumbnailSelector = '{{THUMBNAIL_SELECTOR}}'; // This will be dynamically set
        allThumbnails = Array.from(document.querySelectorAll(thumbnailSelector));

        allThumbnails.forEach(thumb => {
            // TODO: Implement logic to set videoId dataset for each thumbnail if needed
            // Example: const link = thumb.querySelector('a.thumb-popu');
            // if (link) { const urlMatch = link.href.match(/\/video\/(\d+)\//); if (urlMatch && urlMatch[1]) { thumb.dataset.videoId = urlMatch[1]; } }
        });

        applyWatchedStyles();

        allThumbnails.forEach((thumbnail, index) => {
            const buttonContainer = thumbnail; // Adjust this selector if buttons need to be inside a specific container within the thumbnail
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
                const videoPageUrl = thumbnail.querySelector('a').href; // Assuming the thumbnail is a link to the video page
                downloadButton.style.backgroundImage = `url("${loadingIconUrl}")`;

                GM_xmlhttpRequest({
                    method: 'GET', url: videoPageUrl,
                    onload: function(response) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, "text/html");
                        
                        // TODO: Implement logic to extract the video MP4 URL for download
                        let videoMp4Url = null;
                        // Example: const sourceElement = doc.querySelector('#vjsplayer source');
                        // if (sourceElement && sourceElement.src) { videoMp4Url = sourceElement.src; }

                        if (videoMp4Url) {
                            window.open(videoMp4Url, '_blank');
                            setTimeout(() => { downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`; }, 500);
                        } else {
                            alert('Could not find the video source for download.');
                            setTimeout(() => { downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`; }, 500);
                        }
                    },
                    onerror: function() {
                        alert('An error occurred while fetching the video page.');
                        setTimeout(() => { downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`; }, 500);
                    }
                });
            });
        });
    }

    initializeScript();

})();
