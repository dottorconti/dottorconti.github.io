/**
 * ZacPin Audio Web Flasher
 * Manages firmware selection, download, and flashing via Web Serial API
 */

// Configuration
const DEFAULT_MANIFEST_URL = '/ZacPin-Audio/releases/manifest.json';
const MANIFEST_URL =
    new URLSearchParams(window.location.search).get('manifest') ||
    DEFAULT_MANIFEST_URL;

// Board definitions
const BOARDS = [
    {
        key: '1B1125_v1',
        name: '1B1125 (Z1G Classic)',
        model: 'Z1G',
        description: 'Zaccaria 1G - Shooting the Rapids, Hot Wheels, Fire Mountain',
        mcu: 'ESP32'
    },
    {
        key: '1B1146_v1',
        name: '1B1146 v1 (Z1G Audio)',
        model: 'Z1G_Audio',
        description: 'Zaccaria 1G Audio - Space Shuttle, Earth Wind Fire',
        mcu: 'ESP32'
    },
    {
        key: '1B1146_v2',
        name: '1B1146 v2 (Z1G Audio 2)',
        model: 'Z1G_Audio',
        description: 'Zaccaria 1G Audio 2 - Locomotion variant',
        mcu: 'ESP32'
    },
    {
        key: '1B11136',
        name: '1B11136 (Z2G)',
        model: 'Z2G',
        description: 'Zaccaria 2G - Variant 1B11136',
        mcu: 'ESP32'
    },
    {
        key: '1B1170',
        name: '1B1170 (Z2G)',
        model: 'Z2G',
        description: 'Zaccaria 2G - Variant 1B1170',
        mcu: 'ESP32'
    },
    {
        key: '1B11178',
        name: '1B11178 (Z2G)',
        model: 'Z2G',
        description: 'Zaccaria 2G - Variant 1B11178',
        mcu: 'ESP32'
    },
    {
        key: '1B11183',
        name: '1B11183 (Z2G)',
        model: 'Z2G',
        description: 'Zaccaria 2G - Variant 1B11183',
        mcu: 'ESP32'
    }
];

// State
let selectedBoard = null;
let selectedVersion = null;
let manifest = null;
let releases = [];

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    populateBoardSelector();
    loadManifest();
    setupEventListeners();
});

/**
 * Populate board selector dropdown
 */
function populateBoardSelector() {
    const select = document.getElementById('board-select');
    
    BOARDS.forEach(board => {
        const option = document.createElement('option');
        option.value = board.key;
        option.textContent = board.name;
        select.appendChild(option);
    });
}

/**
 * Load available firmware versions from local manifest
 */
async function loadManifest() {
    try {
        showStatus('Loading available versions...', 'info');

        const response = await fetch(MANIFEST_URL, { cache: 'no-store' });

        if (!response.ok) {
            if (response.status === 404) {
                showStatus(
                    `Manifest not found (404). Expected at: ${MANIFEST_URL}`,
                    'error'
                );
                return;
            }
            throw new Error(`Manifest error: ${response.status}`);
        }

        manifest = await response.json();
        releases = Array.isArray(manifest.releases) ? manifest.releases : [];

        if (releases.length === 0) {
            showStatus('No firmware versions found in manifest.', 'warning');
            return;
        }

        populateVersionSelector(releases);
        hideStatus();

    } catch (error) {
        console.error('Error loading manifest:', error);
        showStatus(`Error loading manifest: ${error.message}`, 'error');
    }
}

/**
 * Populate version selector dropdown
 */
function populateVersionSelector(releases) {
    const select = document.getElementById('version-select');
    select.innerHTML = '';
    
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '-- Select a version --';
    select.appendChild(option);
    
    releases.forEach(release => {
        const option = document.createElement('option');
        option.value = release.tag;
        const releaseDate = release.date ? new Date(release.date).toLocaleDateString() : 'n/a';
        option.textContent = `${release.tag} (${releaseDate})`;
        select.appendChild(option);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('board-select').addEventListener('change', onBoardSelected);
    document.getElementById('version-select').addEventListener('change', onVersionSelected);
    // Flash button is now handled by esp-web-install-button component
}

/**
 * Handle board selection
 */
function onBoardSelected(event) {
    const boardKey = event.target.value;
    selectedBoard = BOARDS.find(b => b.key === boardKey);
    
    if (selectedBoard) {
        document.getElementById('board-info').innerHTML = `
            <strong>${selectedBoard.name}</strong><br>
            ${selectedBoard.description}
        `;
    } else {
        document.getElementById('board-info').innerHTML = '';
    }
    
    updateFlashButtonState();
}

/**
 * Handle version selection
 */
function onVersionSelected(event) {
    const versionTag = event.target.value;
    
    if (!versionTag) {
        document.getElementById('version-info').innerHTML = '';
        updateFlashButtonState();
        return;
    }
    
    selectedVersion = releases.find(r => r.tag === versionTag) || null;

    if (!selectedVersion) {
        showStatus('Selected version not found in manifest.', 'error');
        updateFlashButtonState();
        return;
    }

    const assetsCount = selectedVersion.assets
        ? Object.keys(selectedVersion.assets).length
        : 0;
    const date = selectedVersion.date ? new Date(selectedVersion.date) : null;
    const dateText = date ? date.toLocaleDateString() : 'n/a';

    document.getElementById('version-info').innerHTML = `
        <strong>${selectedVersion.tag}</strong> - ${dateText}<br>
        ${assetsCount} firmware variants available
    `;

    updateFlashButtonState();
}

/**
 * Update flash button state
 */
function updateFlashButtonState() {
    const button = document.getElementById('flash-button');
    const ready = selectedBoard && selectedVersion;

    if (!ready) {
        button.setAttribute('disabled', 'true');
        button.removeAttribute('manifest');
        return;
    }

    button.removeAttribute('disabled');
    prepareInstallManifest();
}

/**
 * Prepare install manifest for esp-web-install-button
 */
function prepareInstallManifest() {
    if (!selectedBoard || !selectedVersion) {
        return;
    }

    // Find the firmware binary for selected board
    const firmwarePath = selectedVersion.assets
        ? selectedVersion.assets[selectedBoard.key]
        : null;

    if (!firmwarePath) {
        showStatus(
            `Firmware binary not found for ${selectedBoard.name}. ` +
            `Check the manifest mapping for ${selectedBoard.key}.`,
            'error'
        );
        return;
    }

    // Create manifest for esp-web-install-button
    const installManifest = {
        name: `ZacPin Audio - ${selectedBoard.name}`,
        version: selectedVersion.tag || selectedVersion.version || 'unknown',
        builds: [
            {
                chipFamily: selectedBoard.mcu || 'ESP32',
                parts: [
                    { path: resolveUrl(firmwarePath), offset: 0x10000 }
                ]
            }
        ]
    };

    const blob = new Blob([JSON.stringify(installManifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);

    const button = document.getElementById('flash-button');
    button.setAttribute('manifest', manifestUrl);
    showStatus(`Ready to flash ${selectedBoard.name}`, 'info');
}

/**
 * Resolve relative/absolute URLs
 */
function resolveUrl(path) {
    try {
        return new URL(path, window.location.href).toString();
    } catch (error) {
        return path;
    }
}

/**
 * Update progress bar
 */
function updateProgress(percent, text) {
    document.getElementById('progress-bar').style.width = percent + '%';
    document.getElementById('progress-text').textContent = text || `Flashing... ${percent}%`;
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
    const msgDiv = document.getElementById('status-msg');
    msgDiv.className = `status-msg ${type}`;
    msgDiv.textContent = message;
    msgDiv.style.display = 'block';
}

/**
 * Hide status message
 */
function hideStatus() {
    document.getElementById('status-msg').style.display = 'none';
}

/**
 * Check Web Serial API support
 */
if (!navigator.serial) {
    showStatus(
        '⚠️ Your browser does not support Web Serial API. ' +
        'Please use Chrome, Chromium, or Edge 89+',
        'warning'
    );
    document.getElementById('flash-button').disabled = true;
}
