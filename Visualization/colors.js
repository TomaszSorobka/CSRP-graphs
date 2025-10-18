function rgbToColorArray(rgb) {
    const match = rgb.match(/^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
    const [_, r, g, b] = match;
    return [r, g, b];
}

function rgbToRgba(rgb, alpha) {
    const match = rgb.match(/^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
    if (match) {
        const [_, r, g, b] = match;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return rgb; // Fallback if input isn't valid
}

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');

    // Handle shorthand like "#f0a"
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    if (hex.length !== 6) {
        throw new Error("Invalid hex color");
    }

    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `rgb(${r}, ${g}, ${b})`;
}

function getReadyPalette(colorPalette, n, format) {
    let base = colorPalette.map(hex => format ? hexToRgb(hex) : rgbToColorArray(hexToRgb(hex)));
    let palette = [];
    for (let i = 0; i < n; i++) {
        palette.push(base[i % base.length]);
    }
    return palette;
}

function createCrosshatchPattern(color) {
    const patternCanvas = document.createElement('canvas');
    const size = backgroundCellSize; // Size of one tile
    patternCanvas.width = size;
    patternCanvas.height = size;

    const pc = patternCanvas.getContext('2d');
    pc.strokeStyle = color; // Hatch line color
    pc.lineWidth = 1;

    // Draw crosshatch
    pc.beginPath();
    pc.moveTo(0, 0);
    pc.lineTo(size, size);
    pc.moveTo(size, 0);
    pc.lineTo(0, size);
    pc.stroke();

    return c.createPattern(patternCanvas, 'repeat');
}

// Helper function to compare two colors
function arraysEqual(a, b) {
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

// sigmaC controls how rapidly the color similarity drops off
//  - around 10–20 works well for ΔE2000 
// sigmaS controls spatial decay (depends on your coordinate scale).
//  - if entities are drawn in pixels, try 200–300.
function assignColorsBasedOnDistance(nonSingletonEntities, repeatingMap, colors, sigmaC = 20, sigmaS = 200) {
    const { converter, differenceCiede2000 } = culori;
    const lab = converter('lab');
    const deltaE = differenceCiede2000();
    const seen = new Set();
    
    const entitiesToColor = [];
    // First, add one for all nonSingletonEntities
    for (const e of nonSingletonEntities) {
        const name = e.headers[0];
        if (!seen.has(name)) {
            seen.add(name);
            entitiesToColor.push(e);
        }
    }

    // Then, add one per *missing* name from the repeatingMap (since there can be repeated entities that are singleton)
    for (const [name, list] of Object.entries(repeatingMap)) {
        if (!seen.has(name) && list.length > 0) {
            seen.add(name);
            entitiesToColor.push(list[0]); // take first (or apply your own rule)
        }
    }

    // 1 = “just noticeable difference”, 100 = “opposite colors”
    function colorDistance(c1, c2) {
        return deltaE(lab(c1), lab(c2));
    }

    function assignmentEnergy(entities, colors, assignment) {
        let E = 0;

        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const dc = colorDistance(colors[assignment[i]], colors[assignment[j]]);
                let ds = 0;
                if (repeatingMap.has(entities[i].headers[0]) || repeatingMap.has(entities[j].headers[0])) {
                    ds = repeatingPolygonsDistance(entities[i], entities[j], repeatingMap);
                } else {
                    ds = polygonDistance(entities[i], entities[j]);
                }
                // Exponential penalty: high for close and similar
                const penalty = Math.exp(-dc / sigmaC) * Math.exp(-ds / sigmaS);
                E += penalty;
            }
        }

        return E;
    }

    function simulatedAnnealingAssignment(entities, colors, {
        sigmaC = 20,
        sigmaS = 200,
        iterations = 5000,
        tempStart = 1.0,
        tempEnd = 0.001
    } = {}) {
        const n = entities.length;
        const assignment = Array.from({ length: n }, (_, i) => i % colors.length);
        let bestAssign = [...assignment];

        let currentE = assignmentEnergy(entities, colors, assignment);
        let bestE = currentE;

        for (let iter = 0; iter < iterations; iter++) {
            const T = tempStart * Math.pow(tempEnd / tempStart, iter / iterations);

            // Randomly pick two entities to swap colors
            const i = Math.floor(Math.random() * n);
            const j = Math.floor(Math.random() * n);
            if (i === j) continue;

            const newAssign = [...assignment];
            [newAssign[i], newAssign[j]] = [newAssign[j], newAssign[i]];

            const newE = assignmentEnergy(entities, colors, newAssign, sigmaC, sigmaS);
            const delta = newE - currentE;

            // Accept swap if better or probabilistically worse
            if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
                assignment.splice(0, n, ...newAssign);
                currentE = newE;
                if (newE < bestE) {
                    bestE = newE;
                    bestAssign = [...newAssign];
                }
            }

            // occasional logging
            if (iter % 1000 === 0) {
                console.log(`Iter ${iter} — E=${bestE.toFixed(3)} T=${T.toFixed(4)}`);
                console.log(bestAssign)
            }
        }
        console.log(bestAssign)
        return { bestAssign, bestE };
    }

    return simulatedAnnealingAssignment(entitiesToColor, colors).bestAssign

    // TODO: Instead of returning the assignment, now color all of the entities here:
}


// Overlap-Aware Color Assignment
function assignColorsWithOverlap(graph, palette) {
    let n = graph.length;
    let assignedColors = new Array(n);
    let usage = new Array(palette.length).fill(0);  // Track global palette usage counts

    // Sort nodes by descending degree (more constrained nodes first)
    let nodes = [];
    for (let i = 0; i < n; i++) {
        nodes.push({ index: i, degree: graph[i].length });
    }
    nodes.sort((a, b) => b.degree - a.degree);

    for (let node of nodes) {
        const i = node.index;

        // Find colors used by neighbors
        let usedByNeighbors = new Set();
        for (let neighborIdx of graph[i]) {
            const neighborColor = assignedColors[neighborIdx];
            if (neighborColor) {
                // Find palette index for neighborColor
                palette.forEach((color, paletteIdx) => {
                    if (arraysEqual(color, neighborColor)) {
                        usedByNeighbors.add(paletteIdx);
                    }
                });
            }
        }

        // Find palette colors NOT used by neighbors
        let availableColors = [];
        for (let paletteIdx = 0; paletteIdx < palette.length; paletteIdx++) {
            if (!usedByNeighbors.has(paletteIdx)) {
                availableColors.push({ idx: paletteIdx, usage: usage[paletteIdx] });
            }
        }

        // If availableColors empty, assign fallback black
        if (availableColors.length === 0) {
            assignedColors[i] = `rgb(0, 0, 0)`;
            console.warn(`Fallback black assigned at entity ${i} (no available colors)`);
        } else {
            // Sort available colors by usage, lowest first
            availableColors.sort((a, b) => a.usage - b.usage);
            // Select the color with the lowest usage
            const chosenPaletteIdx = availableColors[0].idx;
            assignedColors[i] = palette[chosenPaletteIdx];
            usage[chosenPaletteIdx] += 1;  // Increment usage count
        }
    }

    return assignedColors;
}