// ==UserScript==
// @name         ThisVid Download & Popup Buttons
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Adds download and popup buttons to thisvid.com thumbnails, opens videos in a popup player.
// @author       You
// @match        *://*.thisvid.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/motherless.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/motherless.user.js
// ==/UserScript==

(function() {
    'use strict';

    let allThumbnails = [];
    let currentIndex = -1;
    const originalPageTitle = document.title;

    const pageLinkIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 16 16"><path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5-.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/><path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/></svg>';
    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708-.708l3 3z"/></svg>';
    const loadingIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid"><circle cx="50" cy="50" r="32" stroke-width="8" stroke="#FFFFFF" stroke-dasharray="50.26548245743669 50.26548245743669" fill="none" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" dur="1s" repeatCount="indefinite" keyTimes="0;1" values="0 50 50;360 50 50"/></circle></svg>';

    // Create Popup Player
    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'tv-popup-overlay';
    popupOverlay.innerHTML = `
        <div id="tv-popup-container">
            <div id="tv-popup-content"></div>
            <div id="tv-popup-title"></div>
            <div id="tv-popup-top-buttons">
                <a id="tv-popup-pagelink" href="#" target="_blank" title="Open Video Page"></a>
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
    const prevBtn = document.getElementById('tv-popup-prev');
    const nextBtn = document.getElementById('tv-popup-next');

    // Add CSS
    const styles = `
        .tumbpu { cursor: pointer; }
        #tv-popup-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.9); display: none;
            justify-content: center; align-items: center; z-index: 10000;
        }
        #tv-popup-container {
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
        }
        #tv-popup-content video {
            display: block; width: auto; height: auto;
            max-width: 95vw; max-height: 85vh;
            transition: all 0.2s ease-in-out;
        }
        #tv-popup-title {
            color: white; text-align: center; margin-top: 10px; max-width: 80vw;
            font-size: 16px; font-family: sans-serif;
        }
        #tv-popup-close {
            position: absolute; top: 10px; right: 10px;
            color: white; cursor: pointer; text-shadow: 0 0 5px black;
            opacity: 0.7; transition: opacity 0.2s;
            z-index: 10001; font-size: 40px; font-family: sans-serif;
        }
        #tv-popup-top-buttons {
            position: absolute; top: 10px; left: 10px;
            display: flex; gap: 15px; z-index: 10001;
        }
        #tv-popup-top-buttons a {
            width: 28px; height: 28px; display: block;
            cursor: pointer; opacity: 0.7; transition: all 0.2s;
        }
        #tv-popup-pagelink { background: url('${pageLinkIconUrl}') center / contain no-repeat; }
        #tv-popup-top-buttons a:hover, .tv-popup-nav:hover, #tv-popup-close:hover {
            opacity: 1; transform: scale(1.1);
        }
        .tv-popup-nav {
            position: absolute; top: 50%; transform: translateY(-50%);
            height: auto; width: auto; z-index: 10001;
            display: flex; align-items: center;
            color: white; cursor: pointer; user-select: none;
            opacity: 0.7; transition: opacity 0.2s;
        }
        #tv-popup-prev { left: 5px; }
        #tv-popup-next { right: 5px; }
        .tv-popup-nav span {
            font-size: 60px; font-weight: bold; font-family: sans-serif;
            padding: 20px 10px; text-shadow: 0 0 8px black;
        }
        #tv-popup-overlay:hover .tv-popup-nav,
        #tv-popup-overlay:hover #tv-popup-close,
        #tv-popup-overlay:hover #tv-popup-top-buttons a {
            opacity: 1;
        }
        #tv-popup-content video::-webkit-media-controls-overlay-play-button { opacity: 0 !important; }
        .tv-loader {
            border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%;
            width: 60px; height: 60px; animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    const styleSheet = document.createElement('style');
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Open Popup Player
    const openPopupPlayer = (index) => {
        if (index < 0 || index >= allThumbnails.length) { return; }
        currentIndex = index;
        const thumbnail = allThumbnails[index];
        const videoPageUrl = thumbnail.href;
        const titleElement = thumbnail.querySelector('.title');
        console.log('Opening popup:', { index, videoPageUrl, title: titleElement?.innerText });

        // Check for private video
        const isPrivate = thumbnail.querySelector('.icon-private');
        if (isPrivate) {
            console.warn('Video appears to be private. Login may be required.');
            popupContent.innerHTML = '<div style="color: white;">Error: This video is private. Please log in to thisvid.com and try again.</div>';
            popupOverlay.style.display = 'flex';
            return;
        }

        pageLinkBtn.href = videoPageUrl;
        popupTitle.innerText = titleElement ? titleElement.innerText.trim() : thumbnail.getAttribute('title') || '';
        document.title = titleElement ? titleElement.innerText.trim() : thumbnail.getAttribute('title') || originalPageTitle;
        popupContent.innerHTML = '<div class="tv-loader"></div>';
        popupOverlay.style.display = 'flex';

        GM_xmlhttpRequest({
            method: 'GET',
            url: videoPageUrl,
            headers: {
                'User-Agent': navigator.userAgent,
                'Referer': 'https://thisvid.com/',
                'Origin': 'https://thisvid.com',
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': document.cookie,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                'sec-ch-ua-platform': '"Chrome OS"',
                'sec-ch-ua-mobile': '?0'
            },
            onload: function(response) {
                console.log('Video page response:', response.responseText.slice(0, 200));
                const htmlText = response.responseText;

                // Check for login prompt
                if (htmlText.includes('login.php')) {
                    console.warn('Login required to access video.');
                    popupContent.innerHTML = '<div style="color: white;">Error: Please log in to thisvid.com to access this video.</div>';
                    return;
                }

                // Try extracting video_url from flashvars
                let videoUrl;
                const flashvarsMatch = htmlText.match(/var flashvars = ({[\s\S]*?});/);
                if (flashvarsMatch) {
                    const videoUrlMatch = flashvarsMatch[1].match(/video_url:\s*['"](function\/0\/)?(.*?)['"]/);
                    if (videoUrlMatch) {
                        videoUrl = videoUrlMatch[2];
                        console.log('Extracted video URL from flashvars:', videoUrl);
                    } else {
                        console.error('video_url not found in flashvars.');
                    }
                    // Check for alternative URL
                    if (!videoUrl) {
                        const altUrlMatch = flashvarsMatch[1].match(/video_alt_url:\s*['"](function\/0\/)?(.*?)['"]/);
                        if (altUrlMatch) {
                            videoUrl = altUrlMatch[2];
                            console.log('Extracted video URL from video_alt_url:', videoUrl);
                        }
                    }
                    // Check for event_reporting2
                    if (!videoUrl) {
                        const eventUrlMatch = flashvarsMatch[1].match(/event_reporting2:\s*['"](function\/0\/)?(.*?)['"]/);
                        if (eventUrlMatch) {
                            videoUrl = eventUrlMatch[2];
                            console.log('Extracted video URL from event_reporting2:', videoUrl);
                        }
                    }
                } else {
                    console.error('Flashvars not found in response.');
                }

                // Fallback: Check for <video> tag src
                if (!videoUrl) {
                    const videoTagMatch = htmlText.match(/<video[^>]+src=['"](.*?)['"]/i);
                    if (videoTagMatch) {
                        videoUrl = videoTagMatch[1];
                        console.log('Extracted video URL from video tag:', videoUrl);
                    } else {
                        console.error('Video tag not found in response.');
                    }
                }

                // Fallback: Try CDN URLs
                if (!videoUrl) {
                    const cdnUrlMatch = htmlText.match(/['"](https:\/\/(ip[0-9]+|jupiter[0-9]*)\.(ahcdn|thisvid)\.com\/key=[^'"]+\.mp4)['"]/i);
                    if (cdnUrlMatch) {
                        videoUrl = cdnUrlMatch[1];
                        console.log('Extracted video URL from CDN:', videoUrl);
                    } else {
                        console.error('CDN URL not found in response.');
                    }
                }

                if (videoUrl) {
                    if (!videoUrl.includes('?')) {
                        videoUrl += `?rnd=${Date.now()}`;
                    }
                    // Attempt to follow redirects
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: videoUrl,
                        headers: {
                            'User-Agent': navigator.userAgent,
                            'Referer': 'https://thisvid.com/',
                            'Origin': 'https://thisvid.com',
                            'Cookie': document.cookie,
                            'Accept': '*/*',
                            'Accept-Language': 'en-US,en;q=0.9',
                            'Accept-Encoding': 'gzip, deflate, br',
                            'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                            'sec-ch-ua-platform': '"Chrome OS"',
                            'sec-ch-ua-mobile': '?0',
                            'Range': 'bytes=0-'
                        },
                        onload: function(videoResponse) {
                            if (videoResponse.status === 200 && videoResponse.finalUrl) {
                                console.log('Resolved video URL:', videoResponse.finalUrl);
                                popupContent.innerHTML = `<video src="${videoResponse.finalUrl}" controls autoplay loop></video>`;
                                const video = popupContent.querySelector('video');
                                video.addEventListener('error', () => {
                                    console.error('Video playback error:', video.error);
                                    popupContent.innerHTML = '<div style="color: white;">Error: Video failed to play. Check console for details or try logging in.</div>';
                                });
                            } else {
                                console.error('Failed to resolve video URL:', { status: videoResponse.status, finalUrl: videoResponse.finalUrl });
                                popupContent.innerHTML = '<div style="color: white;">Error: Could not load video. Try logging in or disabling ad-blocker.</div>';
                            }
                        },
                        onerror: function(error) {
                            console.error('GM_xmlhttpRequest error for video URL:', error);
                            popupContent.innerHTML = '<div style="color: white;">Error: Failed to load video. Try logging in or disabling ad-blocker.</div>';
                        }
                    });
                } else {
                    console.error('No valid video URL found.');
                    popupContent.innerHTML = '<div style="color: white;">Error: Could not find video source. Try logging in or disabling ad-blocker.</div>';
                }
            },
            onerror: function(error) {
                console.error('GM_xmlhttpRequest error:', error);
                popupContent.innerHTML = '<div style="color: white;">Error: Failed to load video page.</div>';
            }
        });
    };

    // Popup Controls
    const closePopup = () => {
        popupOverlay.style.display = 'none';
        popupContent.innerHTML = '';
        popupTitle.innerText = '';
        pageLinkBtn.href = '#';
        currentIndex = -1;
        document.title = originalPageTitle;
    };

    popupOverlay.addEventListener('click', (event) => {
        if (event.target === popupOverlay) closePopup();
    });
    popupCloseBtn.addEventListener('click', closePopup);
    prevBtn.addEventListener('click', () => openPopupPlayer(currentIndex - 1));
    nextBtn.addEventListener('click', () => openPopupPlayer(currentIndex + 1));

    // Update Thumbnails
    const thumbnailSelector = '.tumbpu';
    const updateThumbnails = () => {
        allThumbnails = Array.from(document.querySelectorAll(thumbnailSelector));
        console.log('Thumbnails found:', allThumbnails.length);
        allThumbnails.forEach((thumbnail, index) => {
            const innerContainer = thumbnail.querySelector('.thumb');
            if (!innerContainer || innerContainer.querySelector('button')) return;
            innerContainer.style.position = 'relative';

            const buttonSize = '32px';
            const iconSize = '20px';
            const downloadButton = document.createElement('button');
            downloadButton.style.cssText = `position: absolute; top: 5px; right: 5px; z-index: 9999; width: ${buttonSize}; height: ${buttonSize}; border: 1px solid rgba(255, 255, 255, 0.7); border-radius: 3px; cursor: pointer; background: rgba(0, 0, 0, 0.6) url('${downloadIconUrl}') center / ${iconSize} no-repeat;`;
            innerContainer.appendChild(downloadButton);

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
                console.log('Downloading:', { videoPageUrl });

                // Check for private video
                const isPrivate = thumbnail.querySelector('.icon-private');
                if (isPrivate) {
                    console.warn('Video appears to be private. Login may be required.');
                    alert('This video is private. Please log in to thisvid.com and try again.');
                    downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                    return;
                }

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: videoPageUrl,
                    headers: {
                        'User-Agent': navigator.userAgent,
                        'Referer': 'https://thisvid.com/',
                        'Origin': 'https://thisvid.com',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Cookie': document.cookie,
                        'Accept': '*/*',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                        'sec-ch-ua-platform': '"Chrome OS"',
                        'sec-ch-ua-mobile': '?0'
                    },
                    onload: function(response) {
                        const htmlText = response.responseText;

                        // Check for login prompt
                        if (htmlText.includes('login.php')) {
                            console.warn('Login required to access video.');
                            alert('Please log in to thisvid.com to access this video.');
                            downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                            return;
                        }

                        let videoUrl;
                        const flashvarsMatch = htmlText.match(/var flashvars = ({[\s\S]*?});/);
                        if (flashvarsMatch) {
                            const videoUrlMatch = flashvarsMatch[1].match(/video_url:\s*['"](function\/0\/)?(.*?)['"]/);
                            if (videoUrlMatch) {
                                videoUrl = videoUrlMatch[2];
                                console.log('Download URL from flashvars:', videoUrl);
                            } else {
                                console.error('video_url not found in flashvars.');
                            }
                            // Check for alternative URL
                            if (!videoUrl) {
                                const altUrlMatch = flashvarsMatch[1].match(/video_alt_url:\s*['"](function\/0\/)?(.*?)['"]/);
                                if (altUrlMatch) {
                                    videoUrl = altUrlMatch[2];
                                    console.log('Download URL from video_alt_url:', videoUrl);
                                }
                            }
                            // Check for event_reporting2
                            if (!videoUrl) {
                                const eventUrlMatch = flashvarsMatch[1].match(/event_reporting2:\s*['"](function\/0\/)?(.*?)['"]/);
                                if (eventUrlMatch) {
                                    videoUrl = eventUrlMatch[2];
                                    console.log('Download URL from event_reporting2:', videoUrl);
                                }
                            }
                        } else {
                            console.error('Flashvars not found for download.');
                        }

                        // Fallback: Check for <video> tag src
                        if (!videoUrl) {
                            const videoTagMatch = htmlText.match(/<video[^>]+src=['"](.*?)['"]/i);
                            if (videoTagMatch) {
                                videoUrl = videoTagMatch[1];
                                console.log('Download URL from video tag:', videoUrl);
                            } else {
                                console.error('Video tag not found for download.');
                            }
                        }

                        // Fallback: Try CDN URLs
                        if (!videoUrl) {
                            const cdnUrlMatch = htmlText.match(/['"](https:\/\/(ip[0-9]+|jupiter[0-9]*)\.(ahcdn|thisvid)\.com\/key=[^'"]+\.mp4)['"]/i);
                            if (cdnUrlMatch) {
                                videoUrl = cdnUrlMatch[1];
                                console.log('Download URL from CDN:', videoUrl);
                            } else {
                                console.error('CDN URL not found for download.');
                            }
                        }

                        if (videoUrl) {
                            if (!videoUrl.includes('?')) {
                                videoUrl += `?rnd=${Date.now()}`;
                            }
                            // Attempt to follow redirects
                            GM_xmlhttpRequest({
                                method: 'GET',
                                url: videoUrl,
                                headers: {
                                    'User-Agent': navigator.userAgent,
                                    'Referer': 'https://thisvid.com/',
                                    'Origin': 'https://thisvid.com',
                                    'Cookie': document.cookie,
                                    'Accept': '*/*',
                                    'Accept-Language': 'en-US,en;q=0.9',
                                    'Accept-Encoding': 'gzip, deflate, br',
                                    'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                                    'sec-ch-ua-platform': '"Chrome OS"',
                                    'sec-ch-ua-mobile': '?0',
                                    'Range': 'bytes=0-'
                                },
                                onload: function(videoResponse) {
                                    if (videoResponse.status === 200 && videoResponse.finalUrl) {
                                        console.log('Resolved download URL:', videoResponse.finalUrl);
                                        window.open(videoResponse.finalUrl, '_blank');
                                    } else {
                                        console.error('Failed to resolve download URL:', { status: videoResponse.status, finalUrl: videoResponse.finalUrl });
                                        alert('Could not find a valid video URL. Try logging in or disabling ad-blocker.');
                                    }
                                    downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                                },
                                onerror: function(error) {
                                    console.error('GM_xmlhttpRequest error for download URL:', error);
                                    alert('An error occurred while fetching the video URL. Try logging in or disabling ad-blocker.');
                                    downloadButton.style.backgroundImage = `url("${downloadIconUrl}")`;
                                }
                            });
                        } else {
                            alert('Could not find any direct video URL on the page. Try logging in or disabling ad-blocker.');
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
    };

    // Initial thumbnail scan
    updateThumbnails();

    // Observe DOM changes
    const observer = new MutationObserver(updateThumbnails);
    observer.observe(document.body, { childList: true, subtree: true });
})();
