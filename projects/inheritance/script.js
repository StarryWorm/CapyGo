import {initNodeTemplates, createNodeElement, createEmptyNodeElement} from './templates/templates.js';

// --- Global Variables ---
// Data variables
const treeData = { nodes: [] };
const costDataCsv = "";
let parsedCostData = {};
let nodeMap = {};
let heroMap = {
    Skeleton: { goldCol: 'D', timeCol: 'E' }, Knight: { goldCol: 'F', timeCol: 'G' },
    Ranger: { goldCol: 'H', timeCol: 'I' }, Ghost: { goldCol: 'J', timeCol: 'K' }
};

// State variables
let tiers = [];
let selectedHero = 'Skeleton';
let maxLevels = {}; // { nodeId: maxLevel }
let selectedLevels = {}; // { nodeId: level }

// Baseline state variables
let baselineLevels = {}; // { nodeId: level }
let baselineGoldM = 0;
let baselineBooks = 0;
let baselinePacts = 0;
let baselineTimeS = 0;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadData();

        if (!window.treeData || !window.costDataCsv) {
            console.error("Data variables are missing after loadData!");
            return;
        }

        const rawCsvData = parseCsvData(window.costDataCsv);

        parsedCostData = mapJsonToCsvNames([...window.treeData.nodes], rawCsvData); // Pass a spreaded nodes array

        await initNodeTemplates();
        buildTreeUI();

        document.getElementById('selectedHeroName').textContent = selectedHero;

        document.querySelectorAll('.hero-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.hero-btn').forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
                selectedHero = button.dataset.hero;
                document.getElementById('selectedHeroName').textContent = selectedHero;
                buildTreeUI();
            });
        });

    } catch (error) {
        console.error("Error during initialization/UI build:", error);
        const container = document.getElementById('treeContainer');
        if(container) container.innerHTML = '<p class="text-red-600 font-bold">Error initializing page. Check console.</p>';
    }
});

// --- Dynamic Data Loading ---
async function loadData() {
    const treeUrl = './assets/treeData.json';
    const costUrl = './assets/costData.csv';

    try {
        console.log(`Fetching ${treeUrl}...`);
        const treeResp = await fetch(treeUrl);
        console.log(`Tree Response Status: ${treeResp.status}`);
        if (!treeResp.ok) throw new Error(`Failed to load tree data (status: ${treeResp.status})`);

        let treeJson;
        try {
            treeJson = await treeResp.json();
        } catch (jsonError) {
            console.error('Error parsing tree JSON:', jsonError);
            const rawText = await treeResp.text();
            console.error('Raw text received instead of JSON:', rawText);
            throw jsonError; // Rethrow original error
        }
        window.treeData = treeJson;
        // *** THE KEY LOG ***
        console.log('Assigned treeData immediately:', window.treeData);

        // Fetch costDataCsv (CSV as text)
        console.log(`Fetching ${costUrl}...`);
        const costResp = await fetch(costUrl);
        console.log(`Cost Response Status: ${costResp.status}`);
        if (!costResp.ok) throw new Error(`Failed to load cost data (status: ${costResp.status})`);

        window.costDataCsv = await costResp.text();
        // *** THE KEY LOG ***
        console.log('Assigned costDataCsv immediately (snippet):', window.costDataCsv?.substring(0, 200) + '...'); // Use optional chaining just in case

        console.log('loadData function finished successfully.');

    } catch (err) {
        console.error('Error within loadData function:', err);
        throw err; // Re-throw if needed
    }
}

// --- Utility Functions (parseTime, formatTime, parseCsvData, mapJsonToCsvNames, getNodeName) ---
function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) { return parts[0] * 3600 + parts[1] * 60 + parts[2]; }
    else if (parts.length === 2) { return parts[0] * 60 + parts[1]; }
    else if (parts.length === 1) { return parts[0]; }
    return 0;
}

function formatTime(totalSeconds) {
    if (totalSeconds === 0) return "0 sec";
    totalSeconds = Math.max(0, totalSeconds); // Ensure time is not negative
    const days = Math.floor(totalSeconds / (3600 * 24));
    totalSeconds %= (3600 * 24);
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    let parts = [];
    if (days > 0) parts.push(days + " day" + (days > 1 ? "s" : ""));
    if (hours > 0) parts.push(hours + " hr" + (hours > 1 ? "s" : ""));
    if (minutes > 0) parts.push(minutes + " min");
    if (seconds > 0 || parts.length === 0) parts.push(seconds + " sec");
    return parts.join(', ');
}

function parseCsvData(csvText) {
    const lines = csvText.trim().split('\n');
    const data = {}; // { nodeCsvName: { heroType: { level: { books, goldM, timeS } } } }
    const colIndices = {
        Node: 0, Pacts:1, Books: 2,
        Skeleton_Gold: 3, Skeleton_Time: 4, Knight_Gold: 5, Knight_Time: 6,
        Ranger_Gold: 7, Ranger_Time: 8, Ghost_Gold: 9, Ghost_Time: 10
    };
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim(); if (!line) continue;
        const values = line.split(',').map(v => v.trim());
        const nodeNameLevel = values[colIndices.Node]; if (!nodeNameLevel) continue;
        let level = 0; let nodeBaseName = nodeNameLevel;
        const match = nodeNameLevel.match(/^(.*)\s+(\d+)$/);
        const match2 = nodeNameLevel.match(/^(.*)-(\d+)$/);
        if (match) { nodeBaseName = match[1].trim(); level = parseInt(match[2], 10); }
        else if (match2) { nodeBaseName = match2[1].trim(); level = parseInt(match2[2], 10); }
        else {
            const levelMatch = nodeNameLevel.match(/^Level (\d+)$/);
            if (levelMatch && !nodeNameLevel.includes('-')) { nodeBaseName = nodeNameLevel; level = 1; }
            else { nodeBaseName = nodeNameLevel; level = 1; }
        }
        if (level === 0) continue;
        if (!data[nodeBaseName]) data[nodeBaseName] = {};
        const pacts = parseInt(values[colIndices.Pacts], 10) || 0;
        const books = parseInt(values[colIndices.Books], 10) || 0;
        Object.keys(heroMap).forEach(hero => {
            if (!data[nodeBaseName][hero]) data[nodeBaseName][hero] = {};
            const goldColIdx = colIndices[`${hero}_Gold`]; const timeColIdx = colIndices[`${hero}_Time`];
            const goldM = parseFloat(values[goldColIdx]) || 0;
            const timeStr = values[timeColIdx] || "0:0:0"; const timeS = parseTime(timeStr);
            data[nodeBaseName][hero][level] = { books, pacts, goldM, timeS };
        });
    } return data;
}

function mapJsonToCsvNames(treeNodes, parsedCsv) {
    const mappedData = {}; const csvKeys = Object.keys(parsedCsv);
    treeNodes.forEach(node => {
        mappedData[node.id] = {}; const maxLevel = parseInt(node.progress.split('/')[1], 10);
        let baseNamePattern = ''; let tierNum = 0; const idParts = node.id.split('_');
        const lastPart = idParts[idParts.length - 1]; const potentialTier = parseInt(lastPart, 10);
        if (!isNaN(potentialTier) && potentialTier > 0 && potentialTier <= 6) { tierNum = potentialTier; }
        else if (node.tier) { const tierMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6 }; tierNum = tierMap[node.tier] || 0; }
        if (node.id.startsWith('level_')) baseNamePattern = `Level ${tierNum}`;
        else if (node.id.startsWith('health_')) baseNamePattern = `HP ${tierNum}`;
        else if (node.id.startsWith('attack_')) baseNamePattern = `ATK ${tierNum}`;
        else if (node.id.startsWith('defense_')) baseNamePattern = `DEF ${tierNum}`;
        else if (node.id.startsWith('right_health_')) baseNamePattern = `Enhanced HP`;
        else if (node.id.startsWith('right_attack_')) baseNamePattern = `Enhanced ATK`;
        else if (node.id.startsWith('right_defense_')) baseNamePattern = `Enhanced DEF`;
        else if (node.id.startsWith('right_A_')) baseNamePattern = `Right A ${tierNum}`;
        else if (node.id.startsWith('right_B_')) baseNamePattern = `Right B ${tierNum}`;
        else if (node.id.startsWith('right_C_')) baseNamePattern = `Right C ${tierNum}`;
        else if (node.id.startsWith('middle_')) baseNamePattern = `Middle ${tierNum}`;
        if (baseNamePattern) {
            if(parsedCsv[baseNamePattern] && Object.keys(parsedCsv[baseNamePattern]).length > 0) { mappedData[node.id] = parsedCsv[baseNamePattern]; }
            else {
                const patternRegex = new RegExp(`^${baseNamePattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(?:-|\\s)(\\d+)$`);
                let foundMatch = false;
                csvKeys.forEach(csvKey => {
                    const match = csvKey.match(patternRegex);
                    if (match && parsedCsv[csvKey]) {
                        const level = parseInt(match[1], 10);
                        if (level > 0 && level <= maxLevel) {
                            Object.keys(heroMap).forEach(hero => {
                                if (parsedCsv[csvKey][hero] && parsedCsv[csvKey][hero][level]) {
                                    if (!mappedData[node.id][hero]) mappedData[node.id][hero] = {};
                                    mappedData[node.id][hero][level] = parsedCsv[csvKey][hero][level];
                                    foundMatch = true;
                                } }); } } });
                if (!foundMatch) { console.warn(`Could not map JSON node "${node.id}" (Pattern: "${baseNamePattern}") to CSV data.`); }
            } } else { console.warn(`Could not determine base name pattern for JSON node "${node.id}".`); }
    }); return mappedData;
}

function getNodeName(node, hero) {
    if (typeof node.name === 'string') { return node.name; }
    else if (typeof node.name === 'object' && node.name !== null) { return node.name[hero] || node.name['Skeleton'] || node.id; }
    return node.id;
}

// --- UI Functions (buildTreeUI, addEventListeners, handleLevelChange, updateNodeState, areRequirementsMet) ---
function buildTreeUI() {
    console.log("--- buildTreeUI started ---");
    const container = document.getElementById('treeContainer');
    console.log("Target container element:", container);
    if (!container) {
        console.error("Cannot find treeContainer element!");
        return;
    }
    container.innerHTML = '';
    nodeMap = {};
    tiers = [];
    selectedLevels = {};
    baselineLevels = {};
    resetBaseline();

    window.treeData.nodes.forEach(node => {
        nodeMap[node.id] = node;
        selectedLevels[node.id] = 0;
        baselineLevels[node.id] = 0;
        maxLevels[node.id] = parseInt(node.progress.split('/')[1], 10) || 0;

        let tier = 0;
        const idParts = node.id.split('_');
        const lastPart = idParts.length > 1 ? idParts[idParts.length - 1] : '';
        const potentialTier = parseInt(lastPart, 10);

        if (!isNaN(potentialTier) && potentialTier >= 1 && potentialTier <= 6) {
            tier = potentialTier;
        } else if (node.tier) {
            const tierMap = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6 };
            tier = tierMap[node.tier] || 0;
        } else {
            tier = 1;
            console.log(`  -> Tier defaulted to: ${tier}`);
        }

        if (tier >= 1 && tier <= 6) {
            if (!tiers[tier]) {
                tiers[tier] = { left: [], right: [], main: [], middle: [] };
            }

            let position = node.position || 'main';

            if (!tiers[tier]) {
                return; // Stop processing this node if tier object disappeared
            }

            switch (position) {
                case 'left':
                    if (!tiers[tier].left) console.error(`!!! Trying to push to tiers[${tier}].left but it is undefined! Node: ${node?.id}`);
                    else tiers[tier].left.push(node);
                    break;
                case 'right':
                    if (!tiers[tier].right) console.error(`!!! Trying to push to tiers[${tier}].right but it is undefined! Node: ${node?.id}`);
                    else tiers[tier].right.push(node);
                    break;
                case 'center':
                    if (!tiers[tier].middle) console.error(`!!! Trying to push to tiers[${tier}].middle but it is undefined! Node: ${node?.id}`);
                    else tiers[tier].middle.push(node);
                    break;
                default: // main or default
                    if (!tiers[tier].main) console.error(`!!! Trying to push to tiers[${tier}].main but it is undefined! Node: ${node?.id}`);
                    else tiers[tier].main.push(node);
                    break;
            }
        } else {
            console.warn(`  Node ${node.id} resulted in invalid tier ${tier}. Node SKIPPED.`);
        }
    });

    console.log("Grouped Tiers (after loop):", tiers); // Log the tiers object AFTER the loop finishes

    // Sort tiers and render
    Object.keys(tiers).sort((a, b) => a - b).forEach((tierKey, index) => {
        const tier = tiers[tierKey];
        // console.log(`Rendering Tier ${tierKey}:`, tier);

        // Create tier container
        const tierElement = document.createElement('div');
        tierElement.className = 'tree-tier';

        // Left branch
        const leftDiv = document.createElement('div');
        leftDiv.className = 'tree-branch';
        leftDiv.innerHTML += createEmptyNodeElement(); // Add empty node for alignment
        (tier.left || []).forEach(node => {
            leftDiv.innerHTML += createNodeElement(node, maxLevels[node.id], selectedLevels[node.id], getNodeName(node, selectedHero));
        });

        // Main (center column)
        const mainDiv = document.createElement('div');
        mainDiv.className = 'tree-main';
        (tier.main || []).forEach(node => {
            mainDiv.innerHTML += createNodeElement(node, maxLevels[node.id], selectedLevels[node.id], getNodeName(node, selectedHero));
        });
        mainDiv.innerHTML += createEmptyNodeElement(); // Add empty node for alignment
        (tier.middle || []).forEach(node => {
            mainDiv.innerHTML += createNodeElement(node, maxLevels[node.id], selectedLevels[node.id], getNodeName(node, selectedHero));
        });

        // Right branch
        const rightDiv = document.createElement('div');
        rightDiv.className = 'tree-branch';
        rightDiv.innerHTML += createEmptyNodeElement(); // Add empty node for alignment
        (tier.right || []).forEach(node => {
            rightDiv.innerHTML += createNodeElement(node, maxLevels[node.id], selectedLevels[node.id], getNodeName(node, selectedHero));
        });

        // Append columns to tier container
        tierElement.appendChild(leftDiv);
        tierElement.appendChild(mainDiv);
        tierElement.appendChild(rightDiv);

        // Add tier separator except for last tier
        container.appendChild(tierElement);
        if (index < Object.keys(tiers).length - 1) {
            const sep = document.createElement('div');
            sep.className = 'tier-separator';
            container.appendChild(sep);
        }
    });

    console.log("Finished iterating through tiers for rendering."); // <-- Log after the loop

    addEventListeners(); calculateTotals();
}

function addEventListeners() {
    document.getElementById('saveBaselineBtn').addEventListener('click', saveBaseline);
    document.getElementById('resetTreeBtn').addEventListener('click', buildTreeUI);

    document.querySelectorAll('.level-up-btn').forEach(button => {
        button.addEventListener('click', function() {
            const nodeId = this.dataset.nodeId;
            // console.log(`Level up clicked for ${nodeId}`);
            handleLevelChange(this.parentElement.parentElement, nodeId, 'up');
        });
    });

    document.querySelectorAll('.level-down-btn').forEach(button => {
        button.addEventListener('click', function() {
            const nodeId = this.dataset.nodeId;
            // console.log(`Level down clicked for ${nodeId}`);
            handleLevelChange(this.parentElement.parentElement, nodeId, 'down');
        });
    });
}

function handleLevelChange(divContainer, nodeId, direction) {
    // console.log("handleLevelChange called with divContainer:", divContainer, "Direction:", direction);
    const maxLevel = maxLevels[nodeId] || 0;
    // console.log(nodeId, maxLevel)
    const currentLevel = selectedLevels[nodeId] || 0;
    let newLevel = currentLevel + (direction === 'up' ? 1 : -1);
    if (isNaN(newLevel) || newLevel < 0) newLevel = 0;
    else if (newLevel > maxLevel) newLevel = maxLevel;

    const baseLevel = baselineLevels[nodeId] || 0;
    if (newLevel < baseLevel) { // Don't allow reducing below baseline directly
        alert(`Level cannot be set below the saved baseline level (${baseLevel}). Reset baseline if needed.`);
        newLevel = baseLevel;
    }

    const dependents = Object.values(nodeMap).filter(n => (n.requirements || []).includes(nodeId));
    let dependentBlocking = false;
    for (const dep of dependents) {
        const depLevel = selectedLevels[dep.id] || 0;
        if (depLevel > 0) {
            let depMaxLevel = maxLevels[nodeId] || 0;
            if (depMaxLevel == 3) depMaxLevel = 1; // Special case for Middle nodes
            if (newLevel < depMaxLevel) {
                alert(`Cannot lower this node below its current level because "${getNodeName(dep, selectedHero)}" depends on it and is leveled up.`);
                newLevel = depMaxLevel;
                dependentBlocking = true;
                break;
            }
        }
    }
    if (dependentBlocking) {
        // Optionally update UI to reflect forced level
        divContainer.value = newLevel;
    }

    if (newLevel > baseLevel && !areRequirementsMet(nodeId, newLevel)) { // Check reqs only if increasing level
        // Recursively set all requirements to max level
        function forceRequirements(nodeId) {
            const node = nodeMap[nodeId];
            if (!node || !node.requirements) return;
            node.requirements.forEach(reqId => {
                const reqNode = nodeMap[reqId];
                if (reqNode) {
                    let reqMaxLevel = parseInt(reqNode.progress.split('/')[1], 10);
                    if (reqMaxLevel == 3) reqMaxLevel = 1; // Special case for Middle nodes
                    if (selectedLevels[reqId] < reqMaxLevel) {
                        selectedLevels[reqId] = reqMaxLevel;
                        updateNodeState(reqId, reqMaxLevel); // Update the state of the requirement node
                        forceRequirements(reqId);
                    }
                }
            });
        }
        forceRequirements(nodeId);
    }

    if (selectedLevels[nodeId] !== newLevel) {
        selectedLevels[nodeId] = newLevel;
        const nodeDiv = document.getElementById(`node-${nodeId}`);
        if(nodeDiv) {
            const levelSpan = nodeDiv.querySelector('.current-level');
            if(levelSpan) levelSpan.textContent = newLevel;
        }
        updateNodeState(nodeId, newLevel); // Update enabled/disabled states and styling
        calculateTotals(); // Recalculate costs based on difference from baseline
    }
}

function updateNodeState(nodeId, newLevel) {
    console.log("updateNodeState called with Node ID:", nodeId, "New Level:", newLevel);

    const isEnabled = newLevel > 0; // Enable if reqs met OR already has levels
    const baseLevel = baselineLevels[nodeId] || 0;
    const nodeElement = document.getElementById(`node-${nodeId}`);

    // Update visual state (opacity, background)
    const levelSpan = nodeElement.querySelector('.current-level');
    if (levelSpan) levelSpan.textContent = newLevel;

    if (isEnabled) {
        nodeElement.classList.add('enabled');
    } else {
        nodeElement.classList.remove('enabled');
        if (newLevel > 0 && newLevel > baseLevel) { // Reset only if above baseline and reqs become unmet
            selectedLevels[nodeId] = baseLevel;
            input.value = baseLevel;
            const levelSpan = nodeElement.querySelector('.current-level');
            if(levelSpan) levelSpan.textContent = baseLevel;
        }
    }
}

// Updated to check requirements based on the target level we want to reach
function areRequirementsMet(nodeId, targetLevel) {
    const node = nodeMap[nodeId];
    if (!node || !node.requirements || node.requirements.length === 0) {
        return true; // No requirements
    }

    return node.requirements.every(reqId => {
        const reqNode = nodeMap[reqId];
        if (!reqNode) return false;
        let reqMaxLevel = parseInt(reqNode.progress.split('/')[1], 10);
        if (reqMaxLevel == 3) reqMaxLevel = 1; // Special case for Middle nodes
        return selectedLevels[reqId] === reqMaxLevel;
    });
}

// --- Calculation ---

/**
 * Calculates the total cost from level 0 to the state defined by the levels map.
 * @param {object} levelsMap - A map of { nodeId: level }.
 * @returns {object} - { goldM, books, timeS }
 */
function calculateCostForState(levelsMap) {
    let stateGoldM = 0;
    let stateBooks = 0;
    let statePacts = 0;
    let stateTimeS = 0;

    Object.keys(levelsMap).forEach(nodeId => {
        const targetLevel = levelsMap[nodeId];
        if (targetLevel > 0) {
            const nodeData = parsedCostData[nodeId];
            if (!nodeData || !nodeData[selectedHero]) { return; } // Skip if no data
            const heroNodeData = nodeData[selectedHero];

            for (let level = 1; level <= targetLevel; level++) {
                if (heroNodeData[level]) {
                    stateGoldM += heroNodeData[level].goldM || 0;
                    stateTimeS += heroNodeData[level].timeS || 0;
                    stateBooks += heroNodeData[level].books || 0;
                    statePacts += heroNodeData[level].pacts || 0;
                } else {
                    // Warning for missing data within the required range
                    console.warn(`(calcCost) Missing cost data for node ${nodeId}, hero ${selectedHero}, level ${level}`);
                }
            }
        }
    });
    return { goldM: stateGoldM, books: stateBooks, pacts: statePacts, timeS: stateTimeS };
}

// Main function to calculate and display the difference from baseline
function calculateTotals() {
    // 1. Calculate cost for the current target state (selectedLevels) from zero
    const targetCosts = calculateCostForState(selectedLevels);

    // 2. Calculate the difference from the baseline costs
    const displayGoldM = Math.max(0, targetCosts.goldM - baselineGoldM);
    const displayBooks = Math.max(0, targetCosts.books - baselineBooks);
    const displayPacts = Math.max(0, targetCosts.pacts - baselinePacts);
    const displayTimeS = Math.max(0, targetCosts.timeS - baselineTimeS);

    // 3. Display results
    document.getElementById('resultGold').textContent = displayGoldM.toFixed(3);
    document.getElementById('resultBooks').textContent = displayBooks.toLocaleString();
    document.getElementById('resultPacts').textContent = displayPacts.toLocaleString();
    document.getElementById('resultTime').textContent = formatTime(displayTimeS);
}

// --- Baseline Functions ---
function saveBaseline() {
    // Deep copy current levels to baseline
    baselineLevels = { ...selectedLevels };

    // Calculate and store costs for this baseline state
    const baselineCosts = calculateCostForState(baselineLevels);
    baselineGoldM = baselineCosts.goldM;
    baselineBooks = baselineCosts.books;
    baselinePacts = baselineCosts.pacts;
    baselineTimeS = baselineCosts.timeS;

    // Update baseline info display
    const baselineInfoDiv = document.getElementById('baselineInfo');
    baselineInfoDiv.innerHTML = `
        Baseline Cost:<br>
        Gold: ${baselineGoldM.toFixed(3)} M | Books: ${baselineBooks.toLocaleString()} | Time: ${formatTime(baselineTimeS)}
    `;

    // Recalculate totals (will show 0 initially as current state matches baseline)
    calculateTotals();

    console.log("Baseline saved:", baselineLevels, baselineCosts); // Debugging
    alert("Current research levels saved as baseline.");
}

function resetBaseline() {
    baselineLevels = {};
    baselineGoldM = 0;
    baselineBooks = 0;
    baselineTimeS = 0;
    // Reset baseline info display
    const baselineInfoDiv = document.getElementById('baselineInfo');
    baselineInfoDiv.innerHTML = `
        Baseline Cost:<br> Gold: 0 M | Books: 0 | Time: 0 sec
    `;
}