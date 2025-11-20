// ==UserScript==
// @name         Xexle Community Stats (v17 - SPA Fixed)
// @namespace    http://tampermonkey.net/
// @version      17.0
// @description  Full database crawler. Works on page navigation (SPA). Blocks logs. Auto-hides.
// @author       You
// @match        https://xexle.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/xexle.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/xexle.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. NETWORK INTERCEPTOR (Global Shield)
    // ==========================================
    // This runs on EVERY page to prevent the log crash from accumulating.
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        if (this._url && (typeof this._url === 'string') && this._url.includes('logs.xexle.com')) {
            // Fake success to kill the request
            Object.defineProperty(this, 'readyState', { value: 4 });
            Object.defineProperty(this, 'status', { value: 200 });
            Object.defineProperty(this, 'responseText', { value: '{}' });
            if (this.onreadystatechange) this.onreadystatechange();
            if (this.onload) this.onload();
            return;
        }
        return originalSend.apply(this, arguments);
    };

    // ==========================================
    // 2. SPA NAVIGATION HANDLER
    // ==========================================
    // This watches the URL and starts/stops the script logic dynamically
    let currentState = 'other';

    setInterval(() => {
        if (window.location.href.includes('/community')) {
            if (currentState !== 'community') {
                currentState = 'community';
                console.log("Xexle Script: Community page detected. Initializing...");
                startCommunityScript();
            }
        } else {
            if (currentState === 'community') {
                currentState = 'other';
                console.log("Xexle Script: Left community page. Cleaning up.");
                cleanupUI();
            }
        }
    }, 1000); // Check every 1 second

    function cleanupUI() {
        const panel = document.getElementById('xexle-panel');
        const mini = document.getElementById('xexle-mini-btn');
        if (panel) panel.remove();
        if (mini) mini.remove();
        isScanning = false; // Stop any active scans
    }

    function startCommunityScript() {
        // Wait for DOM to be ready before drawing UI
        const waitDOM = setInterval(() => {
            if (document.body) {
                clearInterval(waitDOM);
                initUI();
                // Small delay to let Xexle load internal variables
                setTimeout(() => {
                     // Clean legacy storage once per session
                    try { Object.keys(localStorage).forEach(k => { if(k.startsWith('xexle_')) localStorage.removeItem(k); }); } catch(e){}
                    startLogic();
                }, 1500);
            }
        }, 100);
    }

    // ==========================================
    // 3. MAIN LOGIC
    // ==========================================

    const DB_NAME = 'XexleStatsDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'users';
    const BATCH_SIZE = 5;
    const DELAY_MS = 200;
    const IGNORED_FOR_DISPLAY = ["My favorites", "Watch later"];

    let dbInstance = null;
    let memoryCache = {};
    let isScanning = false;
    let scanQueue = [];
    let totalToScan = 0;

    function initUI() {
        if (document.getElementById('xexle-panel')) return; // Don't double draw

        GM_addStyle(`
            #xexle-panel {
                position: fixed; top: 60px; right: 10px; width: 240px;
                background: #dbc1ac; border: 2px solid #553b25;
                padding: 12px; border-radius: 8px; z-index: 9999;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                color: #553b25; font-family: sans-serif; font-size: 13px;
                transition: opacity 0.5s;
                display: block;
            }
            #xexle-panel h3 { margin: 0 0 8px 0; font-size: 16px; text-align: center; border-bottom: 1px solid #553b25; padding-bottom: 5px; }
            .xexle-input { width: 100%; padding: 6px; margin-bottom: 8px; border-radius: 4px; border: 1px solid #553b25; box-sizing: border-box; }
            .xexle-progress-container { width: 100%; background-color: #ddd; height: 8px; border-radius: 4px; margin-top: 10px; overflow: hidden; }
            .xexle-progress-bar { height: 100%; background-color: #4CAF50; width: 0%; transition: width 0.3s; }

            #xexle-mini-btn {
                position: fixed; top: 60px; right: 10px; width: 32px; height: 32px;
                background: #dbc1ac; border: 2px solid #553b25; border-radius: 50%;
                z-index: 9999; cursor: pointer; display: none;
                text-align: center; line-height: 28px; font-weight: 900; color: #553b25;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                font-family: sans-serif;
            }
            #xexle-mini-btn:hover { background: #fff; transform: scale(1.1); }

            .xexle-stat-badge {
                display: block; background: #fff; border-left: 4px solid #553b25;
                padding: 5px; margin-top: 4px; border-radius: 0 4px 4px 0;
                font-size: 0.75rem; color: #333; line-height: 1.3;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            .xexle-top-list { margin: 3px 0 0 0; padding-left: 12px; color: #555; }
            .xexle-top-list li { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
            .xexle-hidden { display: none !important; }
        `);

        const panel = document.createElement('div');
        panel.id = 'xexle-panel';
        panel.innerHTML = `
            <div style="position:absolute; top:5px; right:10px; cursor:pointer; font-weight:bold;" id="xexle-hide-icon">_</div>
            <h3>Full Crawler v17</h3>
            <input type="number" id="xexle-min" class="xexle-input" placeholder="Min Videos" value="0">
            <input type="text" id="xexle-search" class="xexle-input" placeholder="Search (Tag/Desc)...">
            <div class="xexle-progress-container">
                <div id="xexle-progress" class="xexle-progress-bar"></div>
            </div>
            <div id="xexle-status" style="margin-top:5px; font-style:italic; font-size:0.9em;">Waiting...</div>
            <div style="text-align:center; margin-top:10px;">
                <span id="xexle-reset-btn" style="color:#cc0000; font-size:0.75em; cursor:pointer; text-decoration:underline;">Reset DB</span>
            </div>
        `;
        document.body.appendChild(panel);

        const miniBtn = document.createElement('div');
        miniBtn.id = 'xexle-mini-btn';
        miniBtn.innerText = 'X';
        miniBtn.title = "Show Panel";
        document.body.appendChild(miniBtn);

        document.getElementById('xexle-min').addEventListener('input', applyDOMFilters);
        document.getElementById('xexle-search').addEventListener('keyup', applyDOMFilters);
        document.getElementById('xexle-hide-icon').addEventListener('click', () => togglePanel(false));
        miniBtn.addEventListener('click', () => togglePanel(true));

        document.getElementById('xexle-reset-btn').addEventListener('click', () => {
            if(confirm("Reset Database?")) {
                indexedDB.deleteDatabase(DB_NAME);
                localStorage.clear();
                location.reload();
            }
        });
    }

    function togglePanel(show) {
        const panel = document.getElementById('xexle-panel');
        const mini = document.getElementById('xexle-mini-btn');
        if(!panel || !mini) return;

        if (show) {
            panel.style.display = 'block';
            mini.style.display = 'none';
        } else {
            panel.style.display = 'none';
            mini.style.display = 'block';
        }
    }

    function updateStatus(msg, pct = 0) {
        const s = document.getElementById('xexle-status');
        const p = document.getElementById('xexle-progress');
        if(s) s.innerText = msg;
        if(p) p.style.width = pct + '%';
    }

    async function startLogic() {
        await openDB();
        memoryCache = await getAllUsers();

        Object.keys(memoryCache).forEach(u => updateDOMCard(u));
        applyDOMFilters();

        fetchGlobalList();
    }

    function getSession() {
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.session) return unsafeWindow.session;
        if (window.session) return window.session;
        const scripts = document.getElementsByTagName('script');
        for (let s of scripts) {
            const m = s.innerHTML.match(/session\s*[:=]\s*['"]([^'"]+)['"]/);
            if (m) return m[1];
        }
        return "";
    }

    async function fetchGlobalList() {
        if (isScanning) return;
        isScanning = true;
        updateStatus("Fetching Global List...");

        const session = getSession();

        try {
            const response = await fetch("https://xexle.com/api/", {
                method: "POST",
                headers: { "content-type": "application/x-www-form-urlencoded" },
                body: `query=community.getList&type=interesting&session=${encodeURIComponent(session)}`
            });

            const json = await response.json();

            if (json.status && json.data && json.data.lists) {
                processUserList(json.data);
            } else {
                // In a SPA, the session might not be ready instantly. Retry.
                console.log("API not ready, retrying...");
                updateStatus("Waiting for Session...");
                setTimeout(fetchGlobalList, 2000);
            }
        } catch (e) {
            updateStatus("Network Error (Retrying)...");
            setTimeout(fetchGlobalList, 3000);
        }
    }

    function processUserList(data) {
        const ids = data.lists;
        const meta = data.usersData;
        scanQueue = [];

        ids.forEach(id => {
            const info = meta[id];
            if (!info) return;
            const username = info.username;

            if (!memoryCache[username]) memoryCache[username] = { username: username };
            memoryCache[username].description = info.description || "";

            if (!memoryCache[username].galleries) {
                scanQueue.push(username);
            }
        });

        totalToScan = scanQueue.length;

        if (totalToScan > 0) {
            updateStatus(`Found ${ids.length} users. Scanning ${totalToScan} new...`);
            processQueue();
        } else {
            finishScanning(`All ${ids.length} users up to date.`);
        }
    }

    async function processQueue() {
        if (!isScanning) return; // Stop if we left the page
        if (scanQueue.length === 0) {
            finishScanning("Database Complete!");
            return;
        }

        const batch = scanQueue.splice(0, BATCH_SIZE);
        const pct = Math.round(((totalToScan - scanQueue.length) / totalToScan) * 100);
        updateStatus(`Crawling... (${scanQueue.length} left)`, pct);

        await Promise.all(batch.map(async (username) => {
            const stats = await fetchUserGalleries(username);
            const record = { ...memoryCache[username], ...stats };
            memoryCache[username] = record;
            await saveUser(record);
            updateDOMCard(username);
        }));

        setTimeout(processQueue, DELAY_MS);
    }

    function finishScanning(msg) {
        updateStatus(msg, 100);
        applyDOMFilters();
        // Auto Hide Panel after completion
        setTimeout(() => {
            if(document.getElementById('xexle-panel')) togglePanel(false);
        }, 2500);
    }

    async function fetchUserGalleries(username) {
        try {
            const response = await fetch("https://xexle.com/api/", {
                method: "POST",
                headers: { "content-type": "application/x-www-form-urlencoded" },
                body: `query=usersFavoriteContent.getFolders&user=${username}`
            });
            const json = await response.json();
            if (json.status && json.data && json.data.list) {
                return parseGalleryData(json.data.list);
            }
            return { total: 0, galleries: [] };
        } catch (e) { return { total: 0, galleries: [] }; }
    }

    function parseGalleryData(listObject) {
        let total = 0, galleries = [];
        Object.values(listObject).forEach(f => {
            const c = parseInt(f.count, 10) || 0;
            const t = String((f.title !== null && f.title !== undefined) ? f.title : "Unknown");
            total += c;
            galleries.push({ name: t, count: c });
        });
        return { total: total, galleries: galleries };
    }

    // --- DOM ---
    function updateDOMCard(username) {
        const linkDiv = document.querySelector(`div[onclick*="'user','${username}'"]`);
        if (!linkDiv) return;
        const wrapper = linkDiv.parentElement;
        if (wrapper.querySelector('.xexle-stat-badge')) return;

        const data = memoryCache[username];
        if (!data || data.total === undefined) return;

        let displayList = data.galleries.filter(g =>
            !IGNORED_FOR_DISPLAY.some(ig => g.name.toLowerCase() === ig.toLowerCase())
        );
        if (displayList.length === 0 && data.galleries.length > 0) displayList = data.galleries;
        displayList.sort((a, b) => b.count - a.count);

        const top3 = displayList.slice(0, 3).map(g => `<li>${g.name} <b>(${g.count})</b></li>`).join('');
        const badge = document.createElement('div');
        badge.className = 'xexle-stat-badge';
        badge.innerHTML = `<b>${data.total}</b> Videos<ul class="xexle-top-list">${top3 || '<li>No galleries</li>'}</ul>`;
        wrapper.appendChild(badge);
        const row = wrapper.parentElement;
        if(row) row.dataset.xexleUser = username;
    }

    function applyDOMFilters() {
        const min = parseInt(document.getElementById('xexle-min').value, 10) || 0;
        const searchVal = document.getElementById('xexle-search').value.toLowerCase().trim();

        document.querySelectorAll('div[onclick^="routing.set([\'user\'"]').forEach(link => {
            const match = link.getAttribute('onclick').match(/'user','(.*?)'/);
            if (!match) return;
            const username = match[1];
            const rowContainer = link.parentElement.parentElement;
            const data = memoryCache[username];

            if (!data) { rowContainer.classList.remove('xexle-hidden'); return; }

            let isVisible = true;
            if (data.total < min) isVisible = false;
            if (searchVal !== "") {
                const desc = (data.description || "").toLowerCase();
                const galStr = (data.galleries || []).map(g => g.name.toLowerCase()).join(' ');
                if (!desc.includes(searchVal) && !galStr.includes(searchVal)) isVisible = false;
            }
            rowContainer.classList.toggle('xexle-hidden', !isVisible);
            if(isVisible) updateDOMCard(username);
        });
    }

    // --- IDB Boilerplate ---
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "username" });
            };
            req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
            req.onerror = (e) => reject("DB Error");
        });
    }
    function getAllUsers() {
        return new Promise((resolve) => {
            const tx = dbInstance.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).getAll();
            req.onsuccess = () => {
                const map = {};
                req.result.forEach(u => map[u.username] = u);
                resolve(map);
            };
        });
    }
    function saveUser(data) {
        return new Promise((resolve) => {
            const tx = dbInstance.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put(data);
            tx.oncomplete = () => resolve();
        });
    }
})();
