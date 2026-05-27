/**
 * ZacPin Audio Web Flasher
 * Manages firmware selection, download, and flashing via Web Serial API
 */

// Configuration - Using local static files instead of GitHub API (private repo)
const RELEASES_BASE_URL = 'https://dottorconti.github.io/ZacPin-Audio/releases';

// Board definitions
const BOARDS = [
    {
        key: '1B1125_v1',
        name: '1B1125 (Shooting the Rapids, Hot Wheels, Fire Mountain, Star Gods(*))',
        model: 'Z1G',
        description: 'Zaccaria 1G - Shooting the Rapids, Hot Wheels, Fire Mountain',
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
        key: '1B11136_v1',
        name: '1B11136 (Farfalla, Devil Riders, Time Machine, Magic Castle, and Robot)',
        model: 'Z2G',
        description: 'Zaccaria 2G - Farfalla, Devil Riders, Time Machine, Magic Castle, Robot',
        mcu: 'ESP32'
    }
];

// State
let selectedBoard = null;
let selectedRelease = null;
let releases = [];
let releaseManifestCache = new Map();
let currentManifestUrl = null;

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
 * Load available firmware versions from static manifest files
 */
async function loadVersions() {
    try {
        showStatus('Loading available versions...', 'info');

        // Load main releases list
        const manifestListUrl = `${RELEASES_BASE_URL}/manifest.json`;
        console.log('Loading manifest list from:', manifestListUrl);
        
        const manifestListResponse = await fetch(manifestListUrl);

        if (!manifestListResponse.ok) {
            throw new Error(`Release list not found: ${manifestListResponse.status} from ${manifestListUrl}`);
        }

        const manifestList = await manifestListResponse.json();
        console.log('Manifest list loaded:', manifestList);
        console.log(`Found ${manifestList.releases?.length || 0} releases`);
        
        // Load each release's manifest
        releases = [];
        for (const releaseInfo of manifestList.releases) {
            try {
                const manifestUrl = `https://dottorconti.github.io${releaseInfo.manifest_url}`;
                console.log(`Fetching manifest for ${releaseInfo.tag_name} from: ${manifestUrl}`);
                
                const manifestResponse = await fetch(manifestUrl);
                
                if (manifestResponse.ok) {
                    const buildManifest = await manifestResponse.json();
                    console.log(`Loaded manifest for ${releaseInfo.tag_name}:`, buildManifest);
                    
                    releases.push({
                        id: releaseInfo.tag_name,
                        tag_name: releaseInfo.tag_name,
                        name: `Release ${releaseInfo.tag_name}`,
                        published_at: new Date().toISOString(),
                        manifest: buildManifest
                    });
                } else {
                    console.warn(`Failed to load manifest for ${releaseInfo.tag_name}: ${manifestResponse.status}`);
                }
            } catch (error) {
                console.warn(`Could not load manifest for ${releaseInfo.tag_name}:`, error);
            }
        }

        console.log(`Successfully loaded ${releases.length} releases`);
        
        if (releases.length === 0) {
            throw new Error('No releases found or all manifest loads failed');
        }

        populateVersionSelector(releases);
        selectedRelease = releases[0];
        renderVersionInfo(selectedRelease);
        updateFlashButtonState();
        hideStatus();

    } catch (error) {
        console.error('Error loading versions:', error);
        showStatus(`Error loading versions: ${error.message}`, 'error');
    }
}

/**
 * Populate version selector dropdown from manifest
 */
function populateVersionSelector(releases) {
    const select = document.getElementById('version-select');
    select.innerHTML = '';
    
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '-- Select a version --';
    select.appendChild(option);
    
    releases.forEach((release, index) => {
        const versionOption = document.createElement('option');
        versionOption.value = release.id;
        const date = release.published_at ? new Date(release.published_at) : null;
        versionOption.textContent = `${release.tag_name}${date ? ` (${date.toLocaleDateString()})` : ''}`;
        if (index === 0) {
            versionOption.selected = true;
            selectedRelease = release;
        }
        select.appendChild(versionOption);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('board-select').addEventListener('change', onBoardSelected);
    document.getElementById('version-select').addEventListener('change', onVersionSelected);
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
    const releaseId = Number(event.target.value);
    selectedRelease = releases.find(r => r.id === releaseId) || null;

    if (!selectedRelease) {
        document.getElementById('version-info').innerHTML = '';
        updateFlashButtonState();
        return;
    }

    renderVersionInfo(selectedRelease);
    
    updateFlashButtonState();
}

function renderVersionInfo(release) {
    const date = release.published_at ? new Date(release.published_at) : null;
    const boardCount = release.manifest?.builds?.length || 0;

    document.getElementById('version-info').innerHTML = `
        <strong>${release.tag_name}</strong>${date ? ` - ${date.toLocaleDateString()}` : ''}<br>
        ${boardCount} boards available
    `;
}

/**
 * Update flash button state
 */
function updateFlashButtonState() {
    const button = document.getElementById('flash-button');
    const ready = !!selectedBoard && !!selectedRelease;

    if (!ready) {
        button.setAttribute('disabled', 'true');
        button.removeAttribute('manifest');
        return;
    }

    button.removeAttribute('disabled');
    prepareInstallManifest().catch(error => {
        console.error('Manifest preparation error:', error);
        showStatus(`Flash setup failed: ${error.message}`, 'error');
        button.setAttribute('disabled', 'true');
        button.removeAttribute('manifest');
    });
}

/**
 * Handle flash button click
 */
async function prepareInstallManifest() {
    if (!selectedBoard || !selectedRelease) {
        return;
    }

    const releaseManifest = await getReleaseManifest(selectedRelease);
    const installManifest = buildInstallManifest(selectedRelease, releaseManifest, selectedBoard);

    const blob = new Blob([JSON.stringify(installManifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(blob);

    if (currentManifestUrl) {
        URL.revokeObjectURL(currentManifestUrl);
    }

    currentManifestUrl = manifestUrl;
    const button = document.getElementById('flash-button');
    button.setAttribute('manifest', manifestUrl);
    showStatus(`Ready to flash ${selectedBoard.name}`, 'info');
}

async function getReleaseManifest(release) {
    if (releaseManifestCache.has(release.id)) {
        return releaseManifestCache.get(release.id);
    }

    // If manifest is already stored in release object, use it
    if (release.manifest) {
        releaseManifestCache.set(release.id, release.manifest);
        return release.manifest;
    }

    throw new Error('Manifest not available');
}

function buildInstallManifest(release, releaseManifest, board) {
    if (!releaseManifest || !Array.isArray(releaseManifest.builds)) {
        throw new Error('Invalid manifest format in release');
    }

    const buildInfo = releaseManifest.builds.find(build =>
        build.key === board.key ||
        build.board === board.key ||
        build.board_key === board.key ||
        build.boardName === board.key ||
        build.id === board.key
    );

    if (!buildInfo) {
        throw new Error(`Firmware not found for ${board.name}`);
    }

    const assetMap = buildAssetMap(release);
    const parts = extractParts(buildInfo, assetMap);

    if (!parts.length) {
        throw new Error('No flashable parts found in manifest');
    }

    return {
        name: `ZacPin Audio - ${board.name}`,
        version: releaseManifest.version || release.tag_name || release.name || 'unknown',
        builds: [
            {
                chipFamily: buildInfo.chipFamily || releaseManifest.chipFamily || 'ESP32',
                parts
            }
        ]
    };
}

function buildAssetMap(release) {
    const map = {};
    if (!release || !Array.isArray(release.assets)) {
        return map;
    }

    release.assets.forEach(asset => {
        if (asset && asset.name && asset.browser_download_url) {
            map[asset.name] = asset.browser_download_url;
        }
    });

    return map;
}

function findAssetByKeyword(assetMap, keyword) {
    const entries = Object.entries(assetMap);
    const match = entries.find(([name]) => name.toLowerCase().includes(keyword));
    return match ? match[1] : null;
}

function findBootloaderAsset(assetMap) {
    return findAssetByKeyword(assetMap, 'bootloader');
}

function findPartitionsAsset(assetMap) {
    return findAssetByKeyword(assetMap, 'partition') || findAssetByKeyword(assetMap, 'partitions');
}

function findBootApp0Asset(assetMap) {
    return findAssetByKeyword(assetMap, 'boot_app0');
}

function resolveAssetUrl(value, assetMap) {
    if (!value) {
        return null;
    }

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    return assetMap[value] || value;
}

function extractParts(buildInfo, assetMap) {
    if (Array.isArray(buildInfo.parts)) {
        return buildInfo.parts.map(part => ({
            path: resolveAssetUrl(part.path, assetMap),
            offset: part.offset
        })).filter(part => part.path && part.offset);
    }

    const parts = [];

    const bootloader = resolveAssetUrl(buildInfo.bootloader_url || buildInfo.bootloader, assetMap)
        || findBootloaderAsset(assetMap);
    if (bootloader) {
        parts.push({ path: bootloader, offset: '0x1000' });
    }

    const partitions = resolveAssetUrl(buildInfo.partitions_url || buildInfo.partitions, assetMap)
        || findPartitionsAsset(assetMap);
    if (partitions) {
        parts.push({ path: partitions, offset: '0x8000' });
    }

    const bootApp0 = resolveAssetUrl(buildInfo.boot_app0_url || buildInfo.boot_app0, assetMap)
        || findBootApp0Asset(assetMap);
    if (bootApp0) {
        parts.push({ path: bootApp0, offset: '0xe000' });
    }

    const firmware = resolveAssetUrl(buildInfo.firmware_url || buildInfo.firmware, assetMap);
    if (firmware) {
        parts.push({ path: firmware, offset: '0x10000' });
    }

    return parts;
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
