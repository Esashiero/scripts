// ==UserScript==
// @name         Motherless Popup & Download Buttons
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Adds popup and download buttons to thumbnails on Motherless.
// @author       You
// @match        *://*.motherless.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. Identify the Thumbnails ---
    const thumbnailSelector = '.mobile-thumb';
    const thumbnails = document.querySelectorAll(thumbnailSelector);

    console.log(`[Motherless Userscript] Found ${thumbnails.length} thumbnails.`);

    // --- Placeholder Icons (SVG embedded as Data URIs) ---
    const popupIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-4a.5.5 0 0 1 1 0v4A2.5 2.5 0 0 1 12.5 15h-9A2.5 2.5 0 0 1 1 12.5v-9A2.5 2.5 0 0 1 3.5 1h4a.5.5 0 0 1 0 1h-4zM10.5 1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0v-2.793L6.354 6.854a.5.5 0 1 1-.708-.708L9.793 2H7.5a.5.5 0 0 1 0-1h3z"/></svg>';
    const downloadIconUrl = 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23FFFFFF"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/></svg>';


    // --- 2. Create and Add Buttons to Each Thumbnail ---
    thumbnails.forEach(thumbnail => {

        // --- Create the POPUP button (Top Left) ---
        const popupButton = document.createElement('button');
        popupButton.style.cssText = `
            position: absolute;
            top: 5px;
            left: 5px;
            z-index: 9999;
            width: 24px;
            height: 24px;
            background-color: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 3px;
            cursor: pointer;
            background-image: url("${popupIconUrl}");
            background-size: 16px 16px;
            background-repeat: no-repeat;
            background-position: center;
        `;

        // --- Create the DOWNLOAD button (Top Right) ---
        const downloadButton = document.createElement('button');
        downloadButton.style.cssText = `
            position: absolute;
            top: 5px;
            right: 5px; /* This positions it on the right */
            z-index: 9999;
            width: 24px;
            height: 24px;
            background-color: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.7);
            border-radius: 3px;
            cursor: pointer;
            background-image: url("${downloadIconUrl}");
            background-size: 16px 16px;
            background-repeat: no-repeat;
            background-position: center;
        `;


        // Find the best container within the thumbnail for positioning
        const innerContainer = thumbnail.querySelector('.mobile-thumb-inner');
        if (innerContainer) {
            innerContainer.style.position = 'relative'; // Crucial for positioning
            innerContainer.appendChild(popupButton);
            innerContainer.appendChild(downloadButton);
        }

        // --- 3. Add Functionality to the buttons ---
        const openGoogle = (event) => {
            // Stop the original link from being followed
            event.preventDefault();
            event.stopPropagation();

            // Open google.com in a new tab
            window.open('https://www.google.com', '_blank');
        };

        popupButton.addEventListener('click', openGoogle);
        downloadButton.addEventListener('click', openGoogle);
    });
})();