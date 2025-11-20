# Project Overview

This project is a collection of JavaScript userscripts designed to enhance the user experience on various video websites. Each script is tailored to a specific site and adds features like:

*   **Download Buttons:** Adds a button to video thumbnails to download the video file directly.
*   **Popup Player:** Allows users to watch videos in a popup overlay without navigating to a new page. The player includes features like next/previous video navigation and aspect ratio control.
*   **Watched Video Tracking:** Dims the thumbnails of videos that have already been watched to help users keep track of new content.

The scripts are written in plain JavaScript and use the `GM_*` APIs provided by userscript managers like Tampermonkey or Greasemonkey for cross-origin requests and data persistence.

## Key Files

*   `motherless.user.js`: A userscript for `motherless.com`.
*   `thisvid.user.js`: A userscript for `thisvid.com`.
*   `tokyomotion.user.js`: A userscript for `tokyomotion.net`.

## Building and Running

These userscripts are not built or compiled. To use them, you need a userscript manager browser extension.

1.  **Install a Userscript Manager:**
    *   [Tampermonkey](https://www.tampermonkey.net/) (recommended, available for Chrome, Firefox, Safari, Edge, etc.)
    *   [Greasemonkey](https://www.greasespot.net/) (for Firefox)

2.  **Install the Scripts:**
    *   Open the `.user.js` file in your browser. The userscript manager should automatically detect it and prompt you to install it.
    *   Alternatively, you can copy the content of the script and create a new script in the userscript manager's dashboard.

The scripts will automatically run when you visit the websites specified in the `@match` directive in the script's header.

## Development Conventions

*   **Userscript Header:** Each script starts with a `==UserScript==` block that contains metadata like the script's name, version, description, and the websites it should run on (`@match`).
*   **IIFE (Immediately Invoked Function Expression):** The code is wrapped in an IIFE `(function() { ... })();` to avoid polluting the global namespace.
*   **`'use strict';`:**  Strict mode is enabled to catch common coding mistakes.
*   **GM APIs:** The scripts use `GM_xmlhttpRequest`, `GM_getValue`, and `GM_setValue` for functionality that requires elevated permissions.
*   **Dependencies:** The scripts are self-contained and do not have any external dependencies that need to be installed via a package manager.
