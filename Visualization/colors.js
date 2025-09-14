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
    let base = colorPalette.map(hex => format? hexToRgb(hex) : rgbToColorArray(hexToRgb(hex)));
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
            // assignedColors[i] = palette[chosenPaletteIdx];
            assignedColors[i] = `rgb(${palette[chosenPaletteIdx][0]}, ${palette[chosenPaletteIdx][1]}, ${palette[chosenPaletteIdx][2]})`;
            usage[chosenPaletteIdx] += 1;  // Increment usage count
        }
    }

    return assignedColors;
}