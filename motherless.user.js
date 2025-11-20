// ==UserScript==
// @name         Motherless Download & Popup Buttons (v4.2 - Cloud Sync)
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  Adds download/popup buttons, fixes lazy-loading, and Syncs Watched History to GitHub.
// @author       You & Gemini
// @match        *://*.motherless.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/motherless.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/motherless.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 0. GITHUB CONFIGURATION (EDIT THIS!)
    // ==========================================
    const GITHUB_TOKEN ="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";
    const GITHUB_USER = "Esashiero";
    const GITHUB_REPO = "scripts";
    const GITHUB_FILE = "motherless_watched.json";

    // API Consts
    const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
    let remoteSha = null; // Needed for GitHub updates
    let syncTimeout = null; // For debouncing uploads

    let allThumbnails = [];
    let currentIndex = -1;
    const originalPageTitle = document.title;
    let watchedVideos = new Set();
    let observer = null;
    let debounceTimeout = null;

    const pageLinkIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5-.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>';
    const favoriteIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/></svg>';
    const zoomIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M5.5 2.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zm-6.5 5a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H4z"/></svg>';

    // --- 1. Create Popup Player Elements (Unchanged) ---
    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'ml-popup-overlay';
    popupOverlay.innerHTML = `
        <div id="ml-popup-container">
            <div id="ml-popup-content"></div>
            <div id="ml-popup-title"></div>
        </div>
        <div id="ml-popup-top-buttons">
            <a id="ml-popup-pagelink" href="#" target="_blank" title="Open Video Page"></a>
            <a id="ml-popup-favorite" title="Add to Favorites"></a>
            <a id="ml-popup-zoom" title="Toggle Aspect Ratio"></a>
        </div>
        <span id="ml-popup-close" title="Close">&times;</span>
        <div id="ml-popup-prev" class="ml-popup-nav"><span>&lsaquo;</span></div>
        <div id="ml-popup-next" class="ml-popup-nav"><span>&rsaquo;</span></div>
    `;
    document.body.appendChild(popupOverlay);

    const popupContent = document.getElementById('ml-popup-content');
    const popupTitle = document.getElementById('ml-popup-title');
    const popupCloseBtn = document.getElementById('ml-popup-close');
    const pageLinkBtn = document.getElementById('ml-popup-pagelink');
    const favoriteBtn = document.getElementById('ml-popup-favorite');
    const zoomBtn = document.getElementById('ml-popup-zoom');
    const prevBtn = document.getElementById('ml-popup-prev');
    const nextBtn = document.getElementById('ml-popup-next');

    // --- 2. Add CSS (Unchanged) ---
    const styles = `
        .mobile-thumb, .desktop-thumb { cursor: pointer; } #ml-popup-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.9); display: none; justify-content: center; align-items: center; z-index: 10000; } #ml-popup-container { display: flex; flex-direction: column; justify-content: center; align-items: center; } #ml-popup-content video { display: block; width: auto; height: auto; max-width: 95vw; max-height: 85vh; transition: all 0.2s ease-in-out; } #ml-popup-content.zoom-active video { width: 100vw; height: 85vh; object-fit: cover; } #ml-popup-title { color: white; text-align: center; margin-top: 10px; max-width: 80vw; font-size: 16px; font-family: sans-serif; } #ml-popup-close { position: absolute; top: 10px; right: 10px; color: white; cursor: pointer; text-shadow: 0 0 5px black; opacity: 0.7; transition: opacity 0.2s; z-index: 10001; font-size: 40px; font-family: sans-serif; } #ml-popup-top-buttons { position: absolute; top: 10px; left: 10px; display: flex; gap: 15px; z-index: 10001; } #ml-popup-top-buttons a { width: 28px; height: 28px; display: block; cursor: pointer; opacity: 0.7; transition: all 0.2s; } #ml-popup-pagelink { background: url('${pageLinkIconUrl}') center / contain no-repeat; } #ml-popup-favorite { background: url('${favoriteIconUrl}') center / contain no-repeat; } #ml-popup-zoom { background: url('${zoomIconUrl}') center / contain no-repeat; } #ml-popup-favorite.favorited { filter: drop-shadow(0 0 3px #ff4d4d) drop-shadow(0 0 8px #ff4d4d); opacity: 1 !important; } .ml-popup-nav { position: absolute; top: 50%; transform: translateY(-50%); height: auto; width: auto; z-index: 10001; display: flex; align-items: center; color: white; cursor: pointer; user-select: none; opacity: 0.7; transition: opacity 0.2s; } #ml-popup-overlay:hover .ml-popup-nav, #ml-popup-overlay:hover #ml-popup-close, #ml-popup-overlay:hover #ml-popup-top-buttons a { opacity: 1; } #ml-popup-top-buttons a:hover, .ml-popup-nav:hover, #ml-popup-close:hover { opacity: 1; transform: scale(1.1); } #ml-popup-prev { left: 5px; } #ml-popup-next { right: 5px; } .ml-popup-nav span { font-size: 60px; font-weight: bold; font-family: sans-serif; padding: 20px 10px; text-shadow: 0 0 8px black; } #ml-popup-content video::-webkit-media-controls-overlay-play-button { opacity: 0 !important; } .ml-loader { border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } .thumb-watched { opacity: 0.5; transition: opacity 0.3s ease; } .thumb-watched:hover { opacity: 1; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- 3. Helper and Core Logic Functions (Unchanged) ---
    const loadWatchedVideos = async () => { const watchedArray = JSON.parse(await GM_getValue('ml_watched_videos', '[]')); watchedVideos = new Set(watchedArray); };
    const markVideoAsWatched = async (codename) => { if (codename && !watchedVideos.has(codename)) { watchedVideos.add(codename); const watchedArray = Array.from(watchedVideos); await GM_setValue('ml_watched_videos', JSON.stringify(watchedArray)); } };
    const applyWatchedStyles = (selector) => { document.querySelectorAll(selector).forEach(thumb => { const codename = thumb.dataset.codename; if (codename && watchedVideos.has(codename)) { const container = thumb.closest('.thumb-container') || thumb; container.classList.add('thumb-watched'); } }); };
    const openPopupPlayer = (index) => { if (index < 0 || index >= allThumbnails.length) { return; } currentIndex = index; const thumbnail = allThumbnails[index]; const codename = thumbnail.dataset.codename; if (!codename) return; const videoPageUrl = thumbnail.querySelector('a').href; markVideoAsWatched(codename); const container = thumbnail.closest('.thumb-container') || thumbnail; container.classList.add('thumb-watched'); pageLinkBtn.href = videoPageUrl; popupContent.classList.remove('zoom-active'); favoriteBtn.style.display = 'none'; const titleElement = thumbnail.querySelector('.thumb-title .title, .caption.title, .gallery-data .title'); document.title = titleElement ? titleElement.innerText.trim() : 'Motherless'; popupTitle.innerText = titleElement ? titleElement.innerText.trim() : ''; popupContent.innerHTML = '<div class="ml-loader"></div>'; popupOverlay.style.display = 'flex'; GM_xmlhttpRequest({ method: 'GET', url: videoPageUrl, onload: function(response) { const htmlText = response.responseText; if (htmlText.includes('favorites/remove')) { favoriteBtn.classList.add('favorited'); } else { favoriteBtn.classList.remove('favorited'); } favoriteBtn.style.display = 'block'; let baseUrl = null; const hdRegex = new RegExp(`(https?://[^/]+/videos/${codename}-720p\\.mp4[^"']*)`); const hdMatch = htmlText.match(hdRegex); if (hdMatch && hdMatch[0]) { baseUrl = hdMatch[0]; } else { const sdRegex = new RegExp(`(https?://[^/]+/videos/${codename}\\.mp4[^"']*)`); const sdMatch = htmlText.match(sdRegex); if (sdMatch && sdMatch[0]) { baseUrl = sdMatch[0]; } } if (baseUrl) { const finalUrl = baseUrl.replace(/&amp;/g, '&'); popupContent.innerHTML = `<video src="${finalUrl}" controls autoplay loop></video>`; } else { popupContent.innerText = 'Error: Could not find video source.'; } }, onerror: function() { popupContent.innerText = 'Error: Failed to load video page.'; } }); };
    const closePopup = () => { popupOverlay.style.display = 'none'; popupContent.innerHTML = ''; popupTitle.innerText = ''; pageLinkBtn.href = '#'; currentIndex = -1; document.title = originalPageTitle; };
    const toggleFavorite = () => { const thumbnail = allThumbnails[currentIndex]; const codename = thumbnail.dataset.codename; const videoPageUrl = pageLinkBtn.href; if (!codename) { alert('Cannot favorite this item: Video codename not found.'); return; } const isFavorited = favoriteBtn.classList.contains('favorited'); const action = isFavorited ? 'remove' : 'add'; const endpointUrl = `https://motherless.com/favorites/${action}`; GM_xmlhttpRequest({ method: "POST", url: endpointUrl, headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", "Origin": "https://motherless.com", "Referer": videoPageUrl }, data: `codename=${codename}`, onload: function(response) { if (response.status === 200) { favoriteBtn.classList.toggle('favorited'); } else { console.error("Favorite request failed. Server response:", response.responseText); alert("An unknown error occurred while favoriting. Are you logged in?"); } }, onerror: function(response) { console.error("Favorite request failed. Network error:", response); alert(`A network error occurred while trying to ${action} favorite.`); } }); };
    const toggleZoom = () => { popupContent.classList.toggle('zoom-active'); };
    popupOverlay.addEventListener('click', (event) => { if (event.target === popupOverlay) closePopup(); });
    popupCloseBtn.addEventListener('click', closePopup);
    prevBtn.addEventListener('click', () => openPopupPlayer(currentIndex - 1));
    nextBtn.addEventListener('click', () => openPopupPlayer(currentIndex + 1));
    favoriteBtn.addEventListener('click', toggleFavorite);
    zoomBtn.addEventListener('click', toggleZoom);

    // --- 4. Main Execution Block ---

    function processThumbnails() {
        const thumbnailSelector = '.desktop-thumb.video';
        allThumbnails = Array.from(document.querySelectorAll(thumbnailSelector));

        applyWatchedStyles(thumbnailSelector);

        const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
        const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" style="background:0 0"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="%23FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';

        allThumbnails.forEach((thumbnail) => {
            if (thumbnail.closest('.thumb-container.gallery-container')) return;
            const isVideo = thumbnail.dataset.codename && thumbnail.dataset.codename.length > 0;
            if (!isVideo) return;

            const lazyImage = thumbnail.querySelector('img[data-lazy-load]');
            if (lazyImage) {
                const realSrc = lazyImage.getAttribute('data-lazy-load');
                if (realSrc && lazyImage.src !== realSrc) {
                    lazyImage.src = realSrc;
                }
            }

            const oldButton = thumbnail.querySelector('.ml-download-btn');
            if (oldButton) oldButton.remove();
            if(thumbnail.dataset.mlListenerAttached) delete thumbnail.dataset.mlListenerAttached;

            // *** THE DEFINITIVE FIX: TARGET THE PARENT, NOT THE LINK ***
            const buttonContainer = thumbnail; // This is the .desktop-thumb div
            if (!buttonContainer) return;
            // Ensure the parent container is the positioning context for the button.
            buttonContainer.style.position = 'relative';

            const downloadButton = document.createElement('button');
            downloadButton.className = 'ml-download-btn';
            // Use specific, !important properties to be safe.
            downloadButton.style.cssText = `
                position: absolute !important; top: 5px !important; right: 5px !important; z-index: 100 !important;
                width: 32px !important; height: 32px !important; border: 1px solid rgba(255, 255, 255, 0.7) !important;
                border-radius: 3px !important; cursor: pointer !important; background-color: rgba(0, 0, 0, 0.6) !important;
                background-image: url('${downloadIconUrl}') !important; background-size: 20px !important;
                background-repeat: no-repeat !important; background-position: center !important; display: block !important;
            `;
            // Append the button to the parent container, making it a SIBLING to the <a> tag.
            buttonContainer.appendChild(downloadButton);

            downloadButton.addEventListener('click', (event) => {
                event.preventDefault(); event.stopPropagation();
                const codename = thumbnail.dataset.codename;
                const videoPageUrl = thumbnail.querySelector('a').href;
                downloadButton.style.backgroundImage = `url("${loadingIconUrl}") !important`; // Add important here too
                GM_xmlhttpRequest({
                    method: 'GET', url: videoPageUrl,
                    onload: function(response) {
                        const htmlText = response.responseText; let baseUrl = null;
                        const hdRegex = new RegExp(`(https?://[^/]+/videos/${codename}-720p\\.mp4[^"']*)`); const hdMatch = htmlText.match(hdRegex);
                        if (hdMatch && hdMatch[0]) { baseUrl = hdMatch[0]; } else { const sdRegex = new RegExp(`(https?://[^/]+/videos/${codename}\\.mp4[^"']*)`); const sdMatch = htmlText.match(sdRegex); if (sdMatch && sdMatch[0]) { baseUrl = sdMatch[0]; } }
                        if (baseUrl) { let finalUrl = baseUrl.replace(/&amp;/g, '&'); finalUrl += "&download&cd=attachment&d=1"; window.open(finalUrl, '_blank'); } else { alert('Could not find any direct video URL on the page.'); }
                        setTimeout(() => { downloadButton.style.backgroundImage = `url("${downloadIconUrl}") !important`; }, 500);
                    },
                    onerror: function() { alert('An error occurred while fetching the video page.'); downloadButton.style.backgroundImage = `url("${downloadIconUrl}") !important`; }
                });
            });

            if (!thumbnail.dataset.mlListenerAttached) {
                thumbnail.addEventListener('click', (event) => {
                    if (event.target.closest('.ml-download-btn')) { return; }
                    event.preventDefault();
                    event.stopPropagation();
                    const newIndex = allThumbnails.indexOf(thumbnail);
                    openPopupPlayer(newIndex);
                });
                thumbnail.dataset.mlListenerAttached = 'true';
            }
        });
    }

    // --- 5. Observer Setup (Unchanged) ---
    function setupObserver() {
        const targetNode = document.getElementById('page-content') || document.body;
        console.log("Motherless Buttons: Observer is now watching", targetNode.id || 'document.body', "for subtree changes.");
        const config = { childList: true, subtree: true };
        const callback = function(mutationsList, observer) {
            for(const mutation of mutationsList) {
                if (mutation.addedNodes.length > 0) {
                    const hasVideoThumb = Array.from(mutation.addedNodes).some(node => node.querySelector && node.querySelector('.desktop-thumb.video'));
                    if (hasVideoThumb) {
                        clearTimeout(debounceTimeout);
                        debounceTimeout = setTimeout(() => {
                            console.log("Motherless Buttons: Gallery has changed. Re-processing thumbnails.");
                            processThumbnails();
                        }, 500);
                        return;
                    }
                }
            }
        };
        observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }

    async function initializeScript() {
        await loadWatchedVideos();

        const mediaPageRegex = /^\/([A-Z0-9]{7})$/i;
        const match = window.location.pathname.match(mediaPageRegex);
        if (match) { await markVideoAsWatched(match[1]); }

        setTimeout(() => {
            console.log("Motherless Buttons: Initializing...");
            processThumbnails();
            setupObserver();
            injectOnPageFavoriteButton();
        }, 1000);
    }

    function injectOnPageFavoriteButton() {
        const mediaPageRegex = /^\/([A-Z0-9]{7})$/i; const path = window.location.pathname; const match = path.match(mediaPageRegex); if (!match) return;
        const buttonBar = document.querySelector('ul.control-buttons'); if (!buttonBar) return;
        const codename = match[1]; const isFavorited = document.body.innerHTML.includes('favorites/remove');
        const favButton = document.createElement('li'); favButton.className = 'control-button clickable favorite-button';
        favButton.title = isFavorited ? 'Remove this from your favorites.' : 'Add this to your favorites.';
        favButton.innerHTML = `<i class="icon-custom heart big"></i> <span class="button-text">${isFavorited ? 'Favorited' : 'Favorite'}</span>`;
        favButton.addEventListener('click', (e) => {
            e.preventDefault(); const currentlyFavorited = favButton.title.includes('Remove'); const action = currentlyFavorited ? 'remove' : 'add'; const endpointUrl = `https://motherless.com/favorites/${action}`;
            GM_xmlhttpRequest({
                method: "POST", url: endpointUrl,
                headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest", "Origin": "https://motherless.com", "Referer": window.location.href },
                data: `codename=${codename}`,
                onload: function(response) {
                    if (response.status === 200) { const newIsFavorited = !currentlyFavorited; favButton.classList.toggle('favorited', newIsFavorited); favButton.title = newIsFavorited ? 'Remove this from your favorites.' : 'Add this to your favorites.'; favButton.querySelector('.button-text').textContent = newIsFavorited ? 'Favorited' : 'Favorite'; }
                    else { console.error("On-page favorite failed. Server response:", response.responseText); alert('An error occurred. Are you logged in?'); }
                }
            });
        });
        buttonBar.prepend(favButton);
    }
    initializeScript();

})();
