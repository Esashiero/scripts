// ==UserScript==
// @name         ThisVid Download & Popup Buttons
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Adds download/favorite/zoom buttons to thisvid.com thumbnails, opens videos in a popup player. Tracks and dims watched videos.
// @author       You & Qwen AI
// @match        *://*.thisvid.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/thisvid.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/thisvid.user.js
// ==/UserScript==

(function() {
    'use strict';

    let allThumbnails = [];
    let currentIndex = -1;
    const originalPageTitle = document.title;
    let watchedVideos = new Set(); // To store watched video codenames

    const pageLinkIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5-.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>';
    const favoriteIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/></svg>';
    const zoomIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M5.5 2.5a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zm5 0a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-1 0v-10a.5.5 0 0 1 .5-.5zm-6.5 5a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H4z"/></svg>';
    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
    const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" style="background:0 0"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="%23FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';

    // --- 1. Create Popup Player Elements ---
    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'tv-popup-overlay';
    popupOverlay.innerHTML = `
        <div id="tv-popup-container">
            <div id="tv-popup-content"></div>
            <div id="tv-popup-title"></div>
        </div>
        <div id="tv-popup-top-buttons">
            <a id="tv-popup-pagelink" href="#" target="_blank" title="Open Video Page"></a>
            <a id="tv-popup-favorite" title="Add to Favorites"></a>
            <a id="tv-popup-zoom" title="Toggle Aspect Ratio"></a>
        </div>
        <span id="tv-popup-close" title="Close">&times;</span>
        <div id="tv-popup-prev" class="tv-popup-nav"><span>&lsaquo;</span></div>
        <div id="tv-popup-next" class="tv-popup-nav"><span>&rsaquo;</span></div>
    `;
    document.body.appendChild(popupOverlay);

    const popupContent = document.getElementById('tv-popup-content');
    const popupTitle = document.getElementById('tv-popup-title');
    const popupCloseBtn = document.getElementById('tv-popup-close');
    const pageLinkBtn = document.getElementById('tv-popup-pagelink');
    const favoriteBtn = document.getElementById('tv-popup-favorite');
    const zoomBtn = document.getElementById('tv-popup-zoom');
    const prevBtn = document.getElementById('tv-popup-prev');
    const nextBtn = document.getElementById('tv-popup-next');

    // --- 2. Add CSS ---
    const styles = `
        .tumbpu { cursor: pointer; }
        #tv-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.9); display: none;
            justify-content: center; align-items: center; z-index: 10000;
        }
        #tv-popup-container { display: flex; flex-direction: column; justify-content: center; align-items: center; }
        #tv-popup-content video { display: block; width: auto; height: auto; max-width: 95vw; max-height: 85vh; transition: all 0.2s ease-in-out; }
        #tv-popup-content.zoom-active video { width: 100vw; height: 85vh; object-fit: cover; }
        #tv-popup-title { color: white; text-align: center; margin-top: 10px; max-width: 80vw; font-size: 16px; font-family: sans-serif; }
        #tv-popup-close { position: absolute; top: 10px; right: 10px; color: white; cursor: pointer; text-shadow: 0 0 5px black; opacity: 0.7; transition: opacity 0.2s; z-index: 10001; font-size: 40px; font-family: sans-serif; }
        #tv-popup-top-buttons { position: absolute; top: 10px; left: 10px; display: flex; gap: 15px; z-index: 10001; }
        #tv-popup-top-buttons a { width: 28px; height: 28px; display: block; cursor: pointer; opacity: 0.7; transition: all 0.2s; }
        #tv-popup-pagelink { background: url('${pageLinkIconUrl}') center / contain no-repeat; }
        #tv-popup-favorite { background: url('${favoriteIconUrl}') center / contain no-repeat; }
        #tv-popup-zoom { background: url('${zoomIconUrl}') center / contain no-repeat; }
        #tv-popup-favorite.favorited { filter: drop-shadow(0 0 3px #ff4d4d) drop-shadow(0 0 8px #ff4d4d); opacity: 1 !important; }
        .tv-popup-nav { position: absolute; top: 50%; transform: translateY(-50%); height: auto; width: auto; z-index: 10001; display: flex; align-items: center; color: white; cursor: pointer; user-select: none; opacity: 0.7; transition: opacity 0.2s; }
        #tv-popup-overlay:hover .tv-popup-nav, #tv-popup-overlay:hover #tv-popup-close, #tv-popup-overlay:hover #tv-popup-top-buttons a { opacity: 1; }
        #tv-popup-top-buttons a:hover, .tv-popup-nav:hover, #tv-popup-close:hover { opacity: 1; transform: scale(1.1); }
        #tv-popup-prev { left: 5px; }
        #tv-popup-next { right: 5px; }
        .tv-popup-nav span { font-size: 60px; font-weight: bold; font-family: sans-serif; padding: 20px 10px; text-shadow: 0 0 8px black; }
        #tv-popup-content video::-webkit-media-controls-overlay-play-button { opacity: 0 !important; }
        .tv-loader { border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Style for watched video thumbnails */
        .thumb-watched { opacity: 0.5; transition: opacity 0.3s ease; }
        .thumb-watched:hover { opacity: 1; }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // --- Functions to manage watched videos ---
    const loadWatchedVideos = async () => {
        const watchedArray = JSON.parse(await GM_getValue('tv_watched_videos', '[]'));
        watchedVideos = new Set(watchedArray);
    };

    const markVideoAsWatched = async (videoId) => {
        if (videoId && !watchedVideos.has(videoId)) {
            watchedVideos.add(videoId);
            const watchedArray = Array.from(watchedVideos);
            await GM_setValue('tv_watched_videos', JSON.stringify(watchedArray));
        }
    };

    const applyWatchedStyles = () => {
        allThumbnails.forEach(thumb => {
            const videoId = getVideoIdFromThumbnail(thumb);
            if (videoId && watchedVideos.has(videoId)) {
                const container = thumb.closest('.thumb-container') || thumb;
                container.classList.add('thumb-watched');
            }
        });
    };

    // Helper function to get a unique identifier for a video from its thumbnail
    const getVideoIdFromThumbnail = (thumbnail) => {
        // Try to get from href first (URL path)
        const href = thumbnail.href;
        if (href) {
            const match = href.match(/\/([^\/]+)$/);
            if (match) {
                return match[1];
            }
        }
        
        // Fallback to other attributes
        return thumbnail.querySelector('.title')?.textContent || 
               thumbnail.getAttribute('title') ||
               thumbnail.querySelector('img')?.src || 
               null;
    };

    // --- 3. The Core Function to Open a Video in the Popup ---
    const openPopupPlayer = (index) => {
        if (index < 0 || index >= allThumbnails.length) { return; }
        currentIndex = index;
        const thumbnail = allThumbnails[index];
        const videoPageUrl = thumbnail.href;
        const videoId = getVideoIdFromThumbnail(thumbnail);

        // Mark video as watched when popup opens
        markVideoAsWatched(videoId);
        const container = thumbnail.closest('.thumb-container') || thumbnail;
        container.classList.add('thumb-watched'); // Apply style instantly

        pageLinkBtn.href = videoPageUrl;
        popupContent.classList.remove('zoom-active');
        favoriteBtn.style.display = 'none'; // Hide initially, show after loading

        const titleElement = thumbnail.querySelector('.title');
        document.title = titleElement ? titleElement.innerText.trim() : 'ThisVid';
        popupTitle.innerText = titleElement ? titleElement.innerText.trim() : '';

        popupContent.innerHTML = '<div class="tv-loader"></div>';
        popupOverlay.style.display = 'flex';

        GM_xmlhttpRequest({
            method: 'GET', url: videoPageUrl,
            onload: function(response) {
                const htmlText = response.responseText;

                // We'll try to extract the video URL regardless of potential login messages
                // Login restrictions are often just warnings and the content might still be accessible

                // Try to extract video URL from multiple sources
                let videoUrl = null;
                
                // Method 1: Extract from flashvars object (most common on video sites)
                const flashvarsMatch = htmlText.match(/var\s+flashvars\s*=\s*({[\s\S]*?});/);
                if (flashvarsMatch) {
                    const flashvarsContent = flashvarsMatch[1];
                    
                    // Look for video_url (primary)
                    let videoUrlMatch = flashvarsContent.match(/["']video_url["']\s*:\s*["']([^"']+)["']/);
                    if (videoUrlMatch) {
                        videoUrl = videoUrlMatch[1].replace(/\\u0026/g, '&'); // Unescape Unicode entities
                    }
                    
                    // If no video_url, try video_alt_url (backup)
                    if (!videoUrl) {
                        const altUrlMatch = flashvarsContent.match(/["']video_alt_url["']\s*:\s*["']([^"']+)["']/);
                        if (altUrlMatch) {
                            videoUrl = altUrlMatch[1].replace(/\\u0026/g, '&');
                        }
                    }
                    
                    // If no video_url/alt, try other common flashvars names
                    if (!videoUrl) {
                        const hdUrlMatch = flashvarsContent.match(/["']video_url_hd["']\s*:\s*["']([^"']+)["']/);
                        if (hdUrlMatch) {
                            videoUrl = hdUrlMatch[1].replace(/\\u0026/g, '&');
                        }
                    }
                    
                    // Try different naming conventions
                    if (!videoUrl) {
                        const altNameMatch = flashvarsContent.match(/["']mp4["']\s*:\s*["']([^"']+)["']/);
                        if (altNameMatch) {
                            videoUrl = altNameMatch[1].replace(/\\u0026/g, '&');
                        }
                    }
                }
                
                // Method 2: Search for <video> tag with src attribute
                if (!videoUrl) {
                    const videoTagMatch = htmlText.match(/<video[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/i);
                    if (videoTagMatch) {
                        videoUrl = videoTagMatch[1];
                    } else {
                        // Try for <source> tag inside video
                        const sourceTagMatch = htmlText.match(/<video[^>]*>[\s\S]*?<source[^>]*src\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/video>/i);
                        if (sourceTagMatch) {
                            videoUrl = sourceTagMatch[1];
                        }
                    }
                }
                
                // Method 3: Try to find URLs in script tags or inline JavaScript
                if (!videoUrl) {
                    const scriptUrlMatch = htmlText.match(/["'](https?:\/\/[^\s"'<>]*\.mp4[^\s"'<>]*)["']/i);
                    if (scriptUrlMatch) {
                        videoUrl = scriptUrlMatch[1];
                    }
                }
                
                // Method 4: Try CDN URLs that match ThisVid's common patterns
                if (!videoUrl) {
                    const cdnUrlMatch = htmlText.match(/(https?:\/\/[^\s"']*\.mp4[^\s"']*)/);
                    if (cdnUrlMatch) {
                        videoUrl = cdnUrlMatch[1];
                    }
                }
                
                // Method 5: Try data-video-url or similar data attributes
                if (!videoUrl) {
                    const dataVideoUrlMatch = htmlText.match(/data-video[-_]url\s*=\s*["']([^"']+)["']/i);
                    if (dataVideoUrlMatch) {
                        videoUrl = dataVideoUrlMatch[1];
                    }
                }
                
                // Method 6: Try iframe sources
                if (!videoUrl) {
                    const iframeMatch = htmlText.match(/<iframe[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/i);
                    if (iframeMatch) {
                        const iframeSrc = iframeMatch[1];
                        if (iframeSrc.includes('.mp4') || iframeSrc.startsWith('http')) {
                            videoUrl = iframeSrc;
                        }
                    }
                }

                if (videoUrl) {
                    // Clean up the URL by replacing HTML entities
                    const cleanUrl = videoUrl
                        .replace(/&amp;/g, '&')
                        .replace(/&#x3D;/g, '=')
                        .replace(/&quot;/g, '"')
                        .replace(/&#x27;/g, "'");
                    
                    popupContent.innerHTML = `<video src="${cleanUrl}" controls autoplay loop></video>`;
                    
                    // Add error handling for the video element
                    const videoElement = popupContent.querySelector('video');
                    videoElement.addEventListener('error', function(event) {
                        console.error('Video playback error:', event.target.error);
                        popupContent.innerHTML = '<div style="color: white;">Error: Video failed to load. The URL might require authentication or be invalid.</div>';
                    });
                } else {
                    popupContent.innerText = 'Error: Could not find video source. The site structure may have changed.';
                    console.error('No video URL found in page content');
                }
            },
            onerror: function(error) {
                console.error('GM_xmlhttpRequest error:', error);
                popupContent.innerHTML = '<div style="color: white;">Error: Failed to load video page. Please check your connection.</div>';
            }
        });
    };

    // Popup Control Functions
    const closePopup = () => {
        popupOverlay.style.display = 'none';
        popupContent.innerHTML = '';
        popupTitle.innerText = '';
        pageLinkBtn.href = '#';
        currentIndex = -1;
        document.title = originalPageTitle;
    };

    const toggleFavorite = () => {
        // This is a placeholder - actual favorite functionality would require ThisVid-specific implementation
        alert('Favorite functionality for ThisVid would require account integration.');
    };

    const toggleZoom = () => {
        popupContent.classList.toggle('zoom-active');
    };

    popupOverlay.addEventListener('click', (event) => { 
        if (event.target === popupOverlay) closePopup(); 
    });
    popupCloseBtn.addEventListener('click', closePopup);
    prevBtn.addEventListener('click', () => openPopupPlayer(currentIndex - 1));
    nextBtn.addEventListener('click', () => openPopupPlayer(currentIndex + 1));
    favoriteBtn.addEventListener('click', toggleFavorite);
    zoomBtn.addEventListener('click', toggleZoom);

    // Update Thumbnails function
    const updateThumbnails = () => {
        const thumbnailSelector = '.tumbpu';
        allThumbnails = Array.from(document.querySelectorAll(thumbnailSelector));

        applyWatchedStyles(); // Apply styles to all thumbnails on update

        allThumbnails.forEach((thumbnail, index) => {
            const innerContainer = thumbnail.querySelector('.thumb');
            if (!innerContainer || innerContainer.querySelector('button')) return;
            
            if (innerContainer) {
                innerContainer.style.position = 'relative';
            } else {
                // If .thumb doesn't exist, use the thumbnail itself
                thumbnail.style.position = 'relative';
            }
            
            const container = innerContainer || thumbnail;
            const buttonSize = '32px';
            const iconSize = '20px';

            const downloadButton = document.createElement('button');
            downloadButton.style.cssText = `position: absolute; top: 5px; right: 5px; z-index: 100; width: ${buttonSize}; height: ${buttonSize}; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 3px; cursor: pointer; background: rgba(0, 0, 0, 0.6) url('${downloadIconUrl}') center / ${iconSize} no-repeat;`;
            container.appendChild(downloadButton);

            thumbnail.addEventListener('click', (event) => {
                if (downloadButton.contains(event.target)) { return; }
                event.preventDefault();
                event.stopPropagation();
                openPopupPlayer(index);
            });

            downloadButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const videoPageUrl = thumbnail.href;
                downloadButton.style.backgroundImage = `url("${loadingIconUrl}")`;
                
                GM_xmlhttpRequest({
                    method: 'GET', url: videoPageUrl,
                    onload: function(response) {
                        const htmlText = response.responseText;

                        // Try to extract video URL from multiple sources
                        let videoUrl = null;

                        // Method 1: Extract from flashvars object (most common on video sites)
                        const flashvarsMatch = htmlText.match(/var\s+flashvars\s*=\s*({[\s\S]*?});/);
                        if (flashvarsMatch) {
                            const flashvarsContent = flashvarsMatch[1];
                            
                            // Look for video_url (primary)
                            let videoUrlMatch = flashvarsContent.match(/["']video_url["']\s*:\s*["']([^"']+)["']/);
                            if (videoUrlMatch) {
                                videoUrl = videoUrlMatch[1].replace(/\\u0026/g, '&'); // Unescape Unicode entities
                            }
                            
                            // If no video_url, try video_alt_url (backup)
                            if (!videoUrl) {
                                const altUrlMatch = flashvarsContent.match(/["']video_alt_url["']\s*:\s*["']([^"']+)["']/);
                                if (altUrlMatch) {
                                    videoUrl = altUrlMatch[1].replace(/\\u0026/g, '&');
                                }
                            }
                            
                            // If no video_url/alt, try other common flashvars names
                            if (!videoUrl) {
                                const hdUrlMatch = flashvarsContent.match(/["']video_url_hd["']\s*:\s*["']([^"']+)["']/);
                                if (hdUrlMatch) {
                                    videoUrl = hdUrlMatch[1].replace(/\\u0026/g, '&');
                                }
                            }
                            
                            // Try different naming conventions
                            if (!videoUrl) {
                                const altNameMatch = flashvarsContent.match(/["']mp4["']\s*:\s*["']([^"']+)["']/);
                                if (altNameMatch) {
                                    videoUrl = altNameMatch[1].replace(/\\u0026/g, '&');
                                }
                            }
                        }
                        
                        // Method 2: Search for <video> tag with src attribute
                        if (!videoUrl) {
                            const videoTagMatch = htmlText.match(/<video[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/i);
                            if (videoTagMatch) {
                                videoUrl = videoTagMatch[1];
                            } else {
                                // Try for <source> tag inside video
                                const sourceTagMatch = htmlText.match(/<video[^>]*>[\s\S]*?<source[^>]*src\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<\/video>/i);
                                if (sourceTagMatch) {
                                    videoUrl = sourceTagMatch[1];
                                }
                            }
                        }
                        
                        // Method 3: Try to find URLs in script tags or inline JavaScript
                        if (!videoUrl) {
                            const scriptUrlMatch = htmlText.match(/["'](https?:\/\/[^\s"'<>]*\.mp4[^\s"'<>]*)["']/i);
                            if (scriptUrlMatch) {
                                videoUrl = scriptUrlMatch[1];
                            }
                        }
                        
                        // Method 4: Try CDN URLs that match ThisVid's common patterns
                        if (!videoUrl) {
                            const cdnUrlMatch = htmlText.match(/(https?:\/\/[^\s"']*\.mp4[^\s"']*)/);
                            if (cdnUrlMatch) {
                                videoUrl = cdnUrlMatch[1];
                            }
                        }
                        
                        // Method 5: Try data-video-url or similar data attributes
                        if (!videoUrl) {
                            const dataVideoUrlMatch = htmlText.match(/data-video[-_]url\s*=\s*["']([^"']+)["']/i);
                            if (dataVideoUrlMatch) {
                                videoUrl = dataVideoUrlMatch[1];
                            }
                        }
                        
                        // Method 6: Try iframe sources
                        if (!videoUrl) {
                            const iframeMatch = htmlText.match(/<iframe[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/i);
                            if (iframeMatch) {
                                const iframeSrc = iframeMatch[1];
                                if (iframeSrc.includes('.mp4') || iframeSrc.startsWith('http')) {
                                    videoUrl = iframeSrc;
                                }
                            }
                        }

                        if (videoUrl) {
                            const cleanUrl = videoUrl
                                .replace(/&amp;/g, '&')
                                .replace(/&#x3D;/g, '=')
                                .replace(/&quot;/g, '"')
                                .replace(/&#x27;/g, "'");
                            
                            // Open the video URL in a new tab for download
                            window.open(cleanUrl, '_blank');
                        } else {
                            alert('Could not find any direct video URL on the page.');
                        }
                        
                        // Reset button icon after delay
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
    };

    // --- 5. Main Execution Block ---
    async function initializeScript() {
        await loadWatchedVideos();

        // Mark current video as watched if on a video page
        const pathParts = window.location.pathname.split('/');
        const videoId = pathParts[pathParts.length - 1];
        if (videoId && !['videos', 'video', 'categories', 'channels', 'search'].includes(videoId.toLowerCase())) {
            await markVideoAsWatched(videoId);
        }

        updateThumbnails();

        // Observe DOM changes for dynamically loaded content
        const observer = new MutationObserver(updateThumbnails);
        observer.observe(document.body, { childList: true, subtree: true });
    }

    initializeScript(); // Run the main function
})();