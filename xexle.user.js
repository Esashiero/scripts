// ==UserScript==
// @name         Xexle Community Stats (v19 - GitHub Auto-Sync)
// @namespace    http://tampermonkey.net/
// @version      19.0
// @description  Full Crawler. Auto-syncs IndexedDB with a private GitHub Repository.
// @author       You
// @match        https://xexle.com/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/Esashiero/scripts/main/xexle.user.js
// @downloadURL  https://raw.githubusercontent.com/Esashiero/scripts/main/xexle.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 0. GITHUB CONFIGURATION (EDIT THIS!)
    // ==========================================
    const GITHUB_TOKEN = "PLACEHOLDER_TOKEN_DO_NOT_PUSH";
    const GITHUB_USER = "Esashiero";
    const GITHUB_REPO = "scripts";
    const GITHUB_FILE = "db.json";

    // Construct API URL
    const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

    // ==========================================
    // 1. NETWORK INTERCEPTOR (Shield)
    // ==========================================
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
        if (this._url && (typeof this._url === 'string') && this._url.includes('logs.xexle.com')) {
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
    // 2. SPA HANDLER
    // ==========================================
    let currentState = 'other';
    setInterval(() => {
        if (window.location.href.includes('/community')) {
            if (currentState !== 'community') {
                currentState = 'community';
                startCommunityScript();
            }
        } else {
            if (currentState === 'community') {
                currentState = 'other';
                cleanupUI();
            }
        }
    }, 1000);

    function cleanupUI() {
        const panel = document.getElementById('xexle-panel');
        const mini = document.getElementById('xexle-mini-btn');
        if (panel) panel.remove();
        if (mini) mini.remove();
        isScanning = false;
    }

    function startCommunityScript() {
        const waitDOM = setInterval(() => {
            if (document.body) {
                clearInterval(waitDOM);
                initUI();
                setTimeout(() => {
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
    let remoteSha = null; // Needed to update GitHub file

    function initUI() {
        if (document.getElementById('xexle-panel')) return;

        GM_addStyle(`
            #xexle-panel {
                position: fixed; top: 60px; right: 10px; width: 240px;
                background: #dbc1ac; border: 2px solid #553b25;
                padding: 12px; border-radius: 8px; z-index: 9999;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                color: #553b25; font-family: sans-serif; font-size: 13px;
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
            .xexle-action-row { display: flex; justify-content: space-between; margin-top: 10px; }
            .xexle-link { color:#005580; font-size:0.8em; cursor:pointer; text-decoration:underline; }
        `);

        const panel = document.createElement('div');
        panel.id = 'xexle-panel';
        panel.innerHTML = `
            <div style="position:absolute; top:5px; right:10px; cursor:pointer; font-weight:bold;" id="xexle-hide-icon">_</div>
            <h3>Cloud Sync v19</h3>
            <input type="number" id="xexle-min" class="xexle-input" placeholder="Min Videos" value="0">
            <input type="text" id="xexle-search" class="xexle-input" placeholder="Search...">
            <div class="xexle-progress-container">
                <div id="xexle-progress" class="xexle-progress-bar"></div>
            </div>
            <div id="xexle-status" style="margin-top:5px; font-style:italic; font-size:0.9em;">Waiting...</div>
            <div class="xexle-action-row">
                <span id="xexle-sync-btn" class="xexle-link">Force Cloud Sync</span>
                <span id="xexle-reset-btn" class="xexle-link" style="color:#cc0000;">Reset</span>
            </div>
        `;
        document.body.appendChild(panel);

        const miniBtn = document.createElement('div');
        miniBtn.id = 'xexle-mini-btn';
        miniBtn.innerText = 'X';
        document.body.appendChild(miniBtn);

        document.getElementById('xexle-min').addEventListener('input', applyDOMFilters);
        document.getElementById('xexle-search').addEventListener('keyup', applyDOMFilters);
        document.getElementById('xexle-hide-icon').addEventListener('click', () => togglePanel(false));
        miniBtn.addEventListener('click', () => togglePanel(true));
        document.getElementById('xexle-sync-btn').addEventListener('click', () => syncWithGitHub(true)); // Manual push
        document.getElementById('xexle-reset-btn').addEventListener('click', () => {
             if(confirm("Reset Local DB?")) { indexedDB.deleteDatabase(DB_NAME); localStorage.clear(); location.reload(); }
        });
    }

    function togglePanel(show) {
        const p = document.getElementById('xexle-panel');
        const m = document.getElementById('xexle-mini-btn');
        if(p && m) { p.style.display = show ? 'block' : 'none'; m.style.display = show ? 'none' : 'block'; }
    }
    function updateStatus(msg, pct = 0) {
        const s = document.getElementById('xexle-status');
        const p = document.getElementById('xexle-progress');
        if(s) s.innerText = msg;
        if(p) p.style.width = pct + '%';
    }

    // ==========================================
    // 4. GITHUB SYNC LOGIC
    // ==========================================
    // Helper: Handle Unicode Strings in Base64
    function unicodeToBase64(str) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
        }));
    }
    function base64ToUnicode(str) {
        return decodeURIComponent(atob(str).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    // Main Sync Function (Pull -> Merge -> Push)
    function syncWithGitHub(forcePush = false) {
        return new Promise((resolve) => {
            if (GITHUB_TOKEN.includes("xxx")) {
                alert("Please edit the script and add your GitHub Token.");
                resolve();
                return;
            }

            updateStatus("Cloud: Pulling...");

            // 1. GET Data
            GM_xmlhttpRequest({
                method: "GET",
                url: API_URL,
                headers: {
                    "Authorization": `token ${GITHUB_TOKEN}`,
                    "Accept": "application/vnd.github.v3+json",
                    "Cache-Control": "no-cache"
                },
                onload: async function(response) {
                    if (response.status === 404) {
                        // File doesn't exist, we will create it on push
                        console.log("GitHub file not found, will create.");
                    } else if (response.status === 200) {
                        const data = JSON.parse(response.responseText);
                        remoteSha = data.sha; // Save SHA for update
                        try {
                            const content = base64ToUnicode(data.content);
                            const remoteDB = JSON.parse(content);

                            // Merge Remote into Local
                            let updates = 0;
                            for (const user in remoteDB) {
                                const local = memoryCache[user];
                                const remote = remoteDB[user];
                                if (!local || (!local.galleries && remote.galleries)) {
                                    memoryCache[user] = remote;
                                    await saveUser(remote);
                                    updates++;
                                }
                            }
                            if(updates > 0) console.log(`Imported ${updates} users from GitHub.`);
                            applyDOMFilters();
                        } catch (e) { console.error("Parse Error", e); }
                    }

                    // 2. PUSH Data (If forced or finished scanning)
                    if (forcePush) {
                        updateStatus("Cloud: Uploading...");
                        pushToGitHub(resolve);
                    } else {
                        resolve();
                    }
                },
                onerror: function(err) { console.error("GitHub Sync Error", err); resolve(); }
            });
        });
    }

    function pushToGitHub(callback) {
        const contentStr = JSON.stringify(memoryCache);
        const base64Content = unicodeToBase64(contentStr);

        const payload = {
            message: "Update xexle db " + new Date().toISOString(),
            content: base64Content,
            sha: remoteSha // If null, GitHub creates a new file
        };

        GM_xmlhttpRequest({
            method: "PUT",
            url: API_URL,
            headers: {
                "Authorization": `token ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            data: JSON.stringify(payload),
            onload: function(response) {
                if (response.status === 200 || response.status === 201) {
                    const d = JSON.parse(response.responseText);
                    remoteSha = d.content.sha; // Update local SHA
                    updateStatus("Cloud Sync Complete!", 100);
                    console.log("GitHub Upload Success.");
                } else {
                    updateStatus("Upload Failed (See Console)");
                    console.error("GitHub Upload Failed", response.responseText);
                }
                if (callback) callback();
            }
        });
    }

    // ==========================================
    // 5. APP FLOW
    // ==========================================
    async function startLogic() {
        await openDB();
        memoryCache = await getAllUsers();

        // Render Local Data
        Object.keys(memoryCache).forEach(u => updateDOMCard(u));
        applyDOMFilters();

        // Step 1: Pull from Cloud
        await syncWithGitHub(false); // False = Pull only, don't push yet

        // Step 2: Start Crawler
        fetchGlobalList();
    }

    function getSession() {
        if (typeof unsafeWindow !== 'undefined' && unsafeWindow.session) return unsafeWindow.session;
        if (window.session) return window.session;
        const s = document.getElementsByTagName('script');
        for (let i of s) {
            const m = i.innerHTML.match(/session\s*[:=]\s*['"]([^'"]+)['"]/);
            if (m) return m[1];
        }
        return "";
    }

    async function fetchGlobalList() {
        if (isScanning) return;
        isScanning = true;
        updateStatus("Fetching User List...");
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
                updateStatus("Waiting for API...");
                setTimeout(fetchGlobalList, 2000);
            }
        } catch (e) {
            updateStatus("Network Error. Retrying...");
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
            // Nothing new to scan, sync to cloud just in case descriptions updated
            updateStatus("Up to date. Syncing Cloud...");
            pushToGitHub();
        }
    }

    async function processQueue() {
        if (scanQueue.length === 0) {
            isScanning = false;
            updateStatus("Scan Done. Uploading to Cloud...");
            pushToGitHub(() => {
                 setTimeout(() => togglePanel(false), 3000); // Auto hide
            });
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

    async function fetchUserGalleries(username) {
        try {
            const response = await fetch("https://xexle.com/api/", {
                method: "POST",
                headers: { "content-type": "application/x-www-form-urlencoded" },
                body: `query=usersFavoriteContent.getFolders&user=${username}`
            });
            const json = await response.json();
            if (json.status && json.data && json.data.list) return parseGalleryData(json.data.list);
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

    // --- DOM & IDB Utils ---
    function updateDOMCard(username) {
        const linkDiv = document.querySelector(`div[onclick*="'user','${username}'"]`);
        if (!linkDiv) return;
        const wrapper = linkDiv.parentElement;
        if (wrapper.querySelector('.xexle-stat-badge')) return;

        const data = memoryCache[username];
        if (!data || data.total === undefined) return;

        let displayList = data.galleries.filter(g => !IGNORED_FOR_DISPLAY.some(ig => g.name.toLowerCase() === ig.toLowerCase()));
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

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => { const db = e.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "username" }); };
            req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
            req.onerror = (e) => reject("DB Error");
        });
    }
    function getAllUsers() { return new Promise((resolve) => { const tx = dbInstance.transaction(STORE_NAME, "readonly"); const req = tx.objectStore(STORE_NAME).getAll(); req.onsuccess = () => { const map = {}; req.result.forEach(u => map[u.username] = u); resolve(map); }; }); }
    function saveUser(data) { return new Promise((resolve) => { const tx = dbInstance.transaction(STORE_NAME, "readwrite"); tx.objectStore(STORE_NAME).put(data); tx.oncomplete = () => resolve(); }); }

})();
