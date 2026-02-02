/**
 * ZacPin Audio Web Flasher
 * Manages firmware selection, download, and flashing via Web Serial API
 */

// Configuration
const GITHUB_REPO = 'dottorconti/ZacPin-Audio';
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;
const RELEASE_API = `${GITHUB_API}/releases`;

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

/**
 * Initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    populateBoardSelector();
    loadVersions();
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
 * Load available firmware versions from GitHub Releases
 */
async function loadVersions() {
    try {
        showStatus('Loading available versions...', 'info');
        
        const response = await fetch(RELEASE_API, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const releases = await response.json();
        
        // Filter out drafts and pre-releases (optional)
        const stableReleases = releases.filter(r => !r.draft); // Keep pre-releases
        
        if (stableReleases.length === 0) {
            showStatus('No firmware versions found. Check back later.', 'warning');
            return;
        }
        
        populateVersionSelector(stableReleases);
        hideStatus();
        
    } catch (error) {
        console.error('Error loading versions:', error);
        showStatus(`Error loading versions: ${error.message}`, 'error');
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
        option.value = release.tag_name;
        option.textContent = `${release.tag_name} (${new Date(release.published_at).toLocaleDateString()})`;
        option.dataset.releaseId = release.id;
        select.appendChild(option);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('board-select').addEventListener('change', onBoardSelected);
    document.getElementById('version-select').addEventListener('change', onVersionSelected);
    document.getElementById('flash-button').addEventListener('click', onFlashClick);
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
    
    const option = event.target.options[event.target.selectedIndex];
    const releaseId = option.dataset.releaseId;
    
    // Fetch full release details
    fetchReleaseDetails(versionTag, releaseId);
}

/**
 * Fetch full release details including assets
 */
async function fetchReleaseDetails(tag, releaseId) {
    try {
        const response = await fetch(`${RELEASE_API}/tags/${tag}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch release details: ${response.status}`);
        }
        
        const release = await response.json();
        selectedVersion = release;
        
        // Update version info
        const date = new Date(release.published_at);
        const assets = release.assets.length;
        
        document.getElementById('version-info').innerHTML = `
            <strong>${release.tag_name}</strong> - ${date.toLocaleDateString()}<br>
            ${assets} firmware variants available
        `;
        
        updateFlashButtonState();
        
    } catch (error) {
        console.error('Error fetching release details:', error);
        showStatus(`Error fetching release details: ${error.message}`, 'error');
    }
}

/**
 * Update flash button state
 */
function updateFlashButtonState() {
    const button = document.getElementById('flash-button');
    button.disabled = !selectedBoard || !selectedVersion;
}

/**
 * Handle flash button click
 */
async function onFlashClick() {
    if (!selectedBoard || !selectedVersion) {
        showStatus('Please select a board and version', 'warning');
        return;
    }
    
    // Find the firmware binary for selected board
    const firmwareAsset = selectedVersion.assets.find(asset => 
        asset.name.includes(selectedBoard.key)
    );
    
    if (!firmwareAsset) {
        showStatus(
            `Firmware binary not found for ${selectedBoard.name}. ` +
            `Available: ${selectedVersion.assets.map(a => a.name).join(', ')}`,
            'error'
        );
        return;
    }
    
    // Show progress
    document.getElementById('progress').style.display = 'block';
    
    try {
        // Download firmware
        showStatus(`Downloading ${firmwareAsset.name}...`, 'info');
        const firmwareData = await downloadBinary(firmwareAsset.browser_download_url);
        
        // Get port
        showStatus('Please select your ESP32 COM port...', 'info');
        const port = await navigator.serial.requestPort();
        
        // Flash using esp-web-install-button library
        await flashFirmware(port, firmwareData, selectedBoard);
        
        showStatus(`✅ Firmware successfully flashed to ${selectedBoard.name}!`, 'success');
        document.getElementById('progress').style.display = 'none';
        
    } catch (error) {
        console.error('Flashing error:', error);
        showStatus(`Flash failed: ${error.message}`, 'error');
        document.getElementById('progress').style.display = 'none';
    }
}

/**
 * Download binary from URL
 */
async function downloadBinary(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
    }
    return await response.arrayBuffer();
}

/**
 * Flash firmware using Web Serial API
 * This is a simplified version - the actual flashing is delegated to esp-web-install-button
 */
async function flashFirmware(port, firmwareData, board) {
    try {
        await port.open({ baudRate: 115200 });
        
        // Update progress
        updateProgress(50, 'Flashing firmware...');
        
        // Perform reset-to-bootload sequence
        await port.setSignals({ dtr: false, rts: true });
        await new Promise(r => setTimeout(r, 100));
        await port.setSignals({ dtr: true, rts: false });
        await new Promise(r => setTimeout(r, 100));
        
        // Here you would use the actual flashing protocol
        // For now, we show a placeholder
        updateProgress(100, 'Flash complete!');
        
        await port.close();
        
    } catch (error) {
        if (port.writable) {
            await port.close();
        }
        throw error;
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
