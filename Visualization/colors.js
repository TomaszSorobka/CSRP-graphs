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

// Generates n perceptually spaced grayscale colors
function generateGrayscalePalette(n) {
    const { formatRgb } = culori;
    const colors = [];

    // perceptual lightness range: avoid extremes (3–97) for better contrast on white/black backgrounds
    const minL = 7;
    const maxL = 97;

    for (let i = 0; i < n; i++) {
        const L = minL + (maxL - minL) * (i / (n - 1));
        const labColor = { mode: 'lab', l: L, a: 0, b: 0 }; // grayscale line (a=b=0)
        colors.push(formatRgb(labColor)); // convert to RGB string
    }

    return colors;
}

function getEntitiesToColor(entityRects, grayscale) {
    nonSingletonEntities = entityRects.filter(e => e.statements.length > 1);
    repeatedEntities = entityRects.filter(e => copiedEntityNames.includes(e.headers[0]));
    const seen = new Set();
    const entitiesToColor = [];

    for (const e of repeatedEntities) {
        const name = e.headers[0];
        if (!groupedMap.has(name)) groupedMap.set(name, []);
        groupedMap.get(name).push(e);
    }

    if (grayscale) {
        // First, add one for all nonSingletonEntities
        for (const e of nonSingletonEntities) {
            const name = e.headers[0];
            if (true /* && !seen.has(name) */) {
                seen.add(name);
                entitiesToColor.push(e);
            }
        }
    } else {
        // First, add one for all nonSingletonEntities
        for (const e of nonSingletonEntities) {
            const name = e.headers[0];
            if (!seen.has(name)) {
                seen.add(name);
                entitiesToColor.push(e);
            }
        }
    }

    // Then, add one per *missing* name from the groupedMap (since there can be repeated entities that are singleton)
    for (const [name, list] of groupedMap.entries()) {
        if (!seen.has(name) && list.length > 0) {
            seen.add(name);
            entitiesToColor.push(list[0]); // take first (or apply your own rule)
        }
    }
    return entitiesToColor;
}

function assignGrayscaleColors(entityRects) {
    const entitiesToColor = getEntitiesToColor(entityRects, true);
    let grayPalette = generateGrayscalePalette(entityRects.length);
    let colorIdx = 0;

    for (let i = 0; i < entitiesToColor.length; i++) {
        entitiesToColor[i].colors[0] = grayPalette[i];
    }


    copiedEntityColors = [];
    for (let i = 0; i < copiedEntityNames.length; i++) {
        copiedEntityColors.push(groupedMap.get(copiedEntityNames[i])[0].colors[0]);
    }

    entityRects.forEach(e => {
        for (let i = 0; i < e.headers.length; i++) {
            if (copiedEntityNames.includes(e.headers[i])) {
                e.colors[i] = copiedEntityColors[copiedEntityNames.indexOf(e.headers[i])];
            }
        }
    });
}

// sigmaC controls how rapidly the color similarity drops off
//  - around 10–20 works well for ΔE2000 
// sigmaS controls spatial decay (depends on distances between polygons).
//  - looking at oour distances maybe between 2 and 8 will work best?
function assignColorsBasedOnDistance(colors, sigmaC = 5, sigmaS = 3) {
    const { converter, differenceCiede2000 } = culori;
    const lab = converter('lab');
    const deltaE = differenceCiede2000();

    const entitiesToColor = getEntitiesToColor(entityRects, false);
    const spatialMatrix = buildSpatialMatrix(entitiesToColor, groupedMap);

    // 1 = “just noticeable difference”, 100 = “opposite colors”
    function colorDistance(c1, c2) {
        return deltaE(lab(c1), lab(c2));
    }

    function assignmentEnergy(entities, colors, assignment) {
        let E = 0;

        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const dc = colorDistance(colors[assignment[i]], colors[assignment[j]]);
                let ds = spatialMatrix[i][j];
                // Exponential penalty: high for close and similar
                const penalty = Math.exp(-dc / sigmaC) * Math.exp(-ds / sigmaS);
                E += penalty;
            }
        }

        return E;
    }

    function simulatedAnnealingAssignment(entities, colors, {
        sigmaC = 5,
        sigmaS = 3,
        iterations = 10000,
        tempStart = 1.0,
        tempEnd = 0.001,
        changeColorsProb = 0.1
    } = {}) {
        const n = entities.length;
        const indices = colors.map((_, i) => i);
        const assignment = [];
        for (let i = 0; i < n; i++) {
            const randIndex = Math.floor(Math.random() * indices.length);
            assignment.push(indices.splice(randIndex, 1)[0]);
        }
        let bestAssign = [...assignment];

        let currentE = assignmentEnergy(entities, colors, assignment);
        let bestE = currentE;

        for (let iter = 0; iter < iterations; iter++) {
            const T = tempStart * Math.pow(tempEnd / tempStart, iter / iterations);
            let newAssign = [...assignment];

            // derive unused from current assignment
            const used = new Set(newAssign);
            const unused = colors.map((_, idx) => idx).filter(idx => !used.has(idx));

            if (Math.random() < changeColorsProb) { // change the colors in the assignment
                // Change one entity's color to a new one
                const i = Math.floor(Math.random() * newAssign.length);
                const newColorIdx = Math.floor(Math.random() * unused.length);
                const newColor = unused[newColorIdx];

                unused.push(newAssign[i]);              // old color goes back to unused
                newAssign[i] = newColor                 // assign new color
                unused.splice(newColorIdx, 1);          // remove it from unused list
            } else {
                // Randomly pick two entities to swap colors
                const i = Math.floor(Math.random() * n);
                const j = Math.floor(Math.random() * n);
                if (i === j) continue;
                const swap = newAssign[i];
                newAssign[i] = newAssign[j];
                newAssign[j] = swap;
            }

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

            // // occasional logging
            // if (iter % 1000 === 0) {
            //     console.log(`Iter ${iter} — E=${bestE.toFixed(3)} T=${T.toFixed(4)}`);
            //     console.log(bestAssign.slice())
            // }
        }
        // console.log(bestAssign)
        return { bestAssign, bestE };
    }

    // return simulatedAnnealingAssignment(entitiesToColor, colors).bestAssign
    bestAssign = simulatedAnnealingAssignment(entitiesToColor, colors).bestAssign;
    for (let ent = 0; ent < entitiesToColor.length; ent++) {
        if (groupedMap.has(entitiesToColor[ent].headers[0])) {
            let repeatedEnt = groupedMap.get(entitiesToColor[ent].headers[0]);
            repeatedEnt.forEach(e => e.colors = [colors[bestAssign[ent]]]);
        }
        else {
            entitiesToColor[ent].colors = [colors[bestAssign[ent]]];
        }
    }

    copiedEntityColors = [];
    for (let i = 0; i < copiedEntityNames.length; i++) {
        copiedEntityColors.push(groupedMap.get(copiedEntityNames[i])[0].colors[0]);
    }
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
