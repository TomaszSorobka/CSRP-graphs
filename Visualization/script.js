// Solution
let w;
let h;
let entities = [];
let statements = [];

// Canvas
const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');
c.font = "normal 10px sans-serif";
c.globalCompositeOperation = "source-over";

// Grid sizes
const backgroundCellSize = 10;
let cellWidth = 20; // in background cells
let cellHeights = []; // in background cells

// The gaps for each row and column
let rowGaps = [];
let columnGaps = [];

// Entities which start or end at each row and column
let rowEntities = [];
let columnEntities = [];

// Canvas elements to be drawn
let entityRects = [];
let statementCells = [];

// Colors for copied entities
let deletedColors = generateDistinctDarkColors(10); // Assumes at most 10 copied entities (TODO: set proper colors)

// Read solution from input
document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const fileContent = e.target.result;
        parseData(fileContent); // Ensure data is processed first

        visualize(); // Visualize solution
        setInterval(loop, 0.1);
    };
    reader.readAsText(file);
});

function parseData(fileContent) {
    // Extract width and height
    const sizeRegex = /w:\s*(\d+)\s*\n\s*h:\s*(\d+)/;
    const sizeMatch = fileContent.match(sizeRegex);

    if (sizeMatch) {
        w = parseInt(sizeMatch[1], 10) + 1;
        h = parseInt(sizeMatch[2], 10) + 1;
    }

    // Regex to capture entity data (including names and coordinates)
    const entityRegex = /Entity (.+?): \((\-?\d+), (\-?\d+)\) - \((\-?\d+), (\-?\d+)\)/g;
    // Regex to capture statement data (including text and single coordinates)
    const statementRegex = /Statement (.+?): \((\-?\d+), (\-?\d+)\)/g;

    let match;

    // Extract entities
    while ((match = entityRegex.exec(fileContent)) !== null) {
        let [_, name, x1, y1, x2, y2] = match;
        const id = entities.length; // Assigning a unique ID based on the current length of the array
        entities.push({
            id,
            name,
            x1: Number(x1),
            y1: Number(y1),
            x2: Number(x2),
            y2: Number(y2),
            statements: [] // Initialize empty statements array for each entity
        });
    }

    // Extract statements and associate them with entities
    while ((match = statementRegex.exec(fileContent)) !== null) {
        let [_, text, x, y] = match;
        const statementId = statements.length; // Assigning a unique ID based on the current length of the array
        const statement = {
            id: statementId,
            text,
            x: Number(x),
            y: Number(y),
            entities: []
        };
        statements.push(statement);

        // Now associate this statement with entities whose coordinates match
        entities.forEach(entity => {
            if ((x >= entity.x1 && x <= entity.x2) && (y >= entity.y1 && y <= entity.y2)) {
                entity.statements.push(statementId); // Add statement ID to the entity's list of statements
            }
        });
    }

    // Sort entities by size
    entities.sort((a, b) => ((a.x2 - a.x1) + (a.y2 - a.y1)) - ((b.x2 - b.x1) + (b.y2 - b.y1)));

    // Set cell width to fit longest entity name
    let maxNameLength = 0;
    entities.forEach(e => {
        if (c.measureText(e.name).width > maxNameLength) maxNameLength = c.measureText(e.name).width;
    });
    // cellWidth = Math.max(cellWidth, Math.ceil(maxNameLength / backgroundCellSize));
}

function generateDistinctDarkColors(n) {
    let colors = [];
    // let maxAttempts = 1000; // Prevent infinite loops
    // let minDist = 50; // Start with a reasonable perceptual distance

    // function colorDistance(c1, c2) {
    //     return Math.sqrt(
    //         Math.pow(c1[0] - c2[0], 2) +
    //         Math.pow(c1[1] - c2[1], 2) +
    //         Math.pow(c1[2] - c2[2], 2)
    //     );
    // }

    // function isDistinct(newColor) {
    //     return colors.every(existing => colorDistance(existing, newColor) > minDist);
    // }

    // let attempts = 0;

    // while (colors.length < n && attempts < maxAttempts) {
    //     let r = Math.floor(Math.random() * 160) + 30;
    //     let g = Math.floor(Math.random() * 160) + 30;
    //     let b = Math.floor(Math.random() * 160) + 30;

    //     let newColor = [r, g, b];

    //     if (isDistinct(newColor)) {
    //         colors.push(`rgb(${r}, ${g}, ${b})`);
    //         attempts = 0; // Reset attempts after success
    //     } else {
    //         attempts++;
    //         if (attempts % 50 === 0) {
    //             minDist -= 5; // Gradually lower minDist if struggling
    //         }
    //     }
    // }

    for (let i = 0; i < n; i++) {
        colors.push(`rgb(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)})`);
    }

    return colors;
}

function rgbToRgba(rgb, alpha) {
    const match = rgb.match(/^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
    if (match) {
        const [_, r, g, b] = match;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return rgb; // fallback if input isn't valid
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

function createCrosshatchPattern(color) {
    const patternCanvas = document.createElement('canvas');
    const size = backgroundCellSize; // size of one tile
    patternCanvas.width = size;
    patternCanvas.height = size;

    const pc = patternCanvas.getContext('2d');
    pc.strokeStyle = color; // hatch line color
    pc.lineWidth = 1;

    // draw crosshatch (two diagonal lines)
    pc.beginPath();
    pc.moveTo(0, 0);
    pc.lineTo(size, size);
    pc.moveTo(size, 0);
    pc.lineTo(0, size);
    pc.stroke();

    return c.createPattern(patternCanvas, 'repeat');
}

function initializeElements() {
    let nonSingletonEntities = [];
    entities.forEach(e => {
        if (e.statements.length > 1) {
            nonSingletonEntities.push(e.id);
        }
    });

    let randomColors = generateDistinctDarkColors(nonSingletonEntities.length);
    let nextColor = 0;

    for (var i = 0; i < entities.length; i++) {
        let id = entities[i].id;
        let name = entities[i].name;
        let x1 = entities[i].x1;
        let y1 = entities[i].y1;
        let x2 = entities[i].x2;
        let y2 = entities[i].y2;
        let statements = entities[i].statements;
        if (nonSingletonEntities.indexOf(id) > -1) {
            entityRects[i] = new Entity(id, name, x1, y1, x2, y2, randomColors[nextColor], statements);
            nextColor++;
        }
        else {
            entityRects[i] = new Entity(id, name, x1, y1, x2, y2, 'rgb(255, 255, 255)', statements);
        }
    }

    for (var i = 0; i < statements.length; i++) {
        let id = statements[i].id;
        let x = statements[i].x;
        let y = statements[i].y;
        let text = statements[i].text;
        let entities = statements[i].entities;
        statementCells[i] = new Statement(id, x, y, i, text, entities);
    }
}

function mergeEntitiesWithSameStatements() {
    for (let i = 0; i < entityRects.length; i++) {
        for (let j = i + 1; j < entityRects.length; j++) {
            if (entityRects[i].statements.sort().join(',') === entityRects[j].statements.sort().join(',')) {
                entityRects[i].headers.push(entityRects[j].name);
                entityRects[i].displayHeaders.push(entityRects[j].displayName);
                entityRects[i].colors.push(entityRects[j].color);
                entityRects[i].marginTop += 2;
                entityRects.splice(j, 1);
            }
        }
    }

    // Add entities to statements' entity lists after merging
    for (let i = 0; i < entityRects.length; i++) {
        for (let j = 0; j < statements.length; j++) {
            if (entityRects[i].statements.includes(statements[j].id)) {
                statements[j].entities.push(entityRects[i]);
            }
        }
    }
}

function markCopiedEntities() {
    // Collect names of copied entities
    let repeated = [];
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            if (entities[i].name == entities[j].name) {
                repeated.push(entities[i].name);
            }
        }
    }

    // Mark headers as copied or not
    entityRects.forEach(e => {
        e.headers.forEach(h => {
            e.deleted.push(repeated.includes(h));
        });
    });

    // Set copied header colors
    entityRects.forEach(e => {
        for (let i = 0; i < e.headers.length; i++) {
            if (repeated.includes(e.headers[i])) {
                e.colors[i] = deletedColors[repeated.indexOf(e.headers[i])];
            }
        }
    });

    // Set number of visible headers
    entityRects.forEach(e => {
        if (e.statements.length > 1) {
            e.visibleHeaders = e.headers.length;
        }
        else {
            e.visibleHeaders = e.deleted.filter(d => d == true).length;
        }
    });

    // Update top margins based on how many of the entity's headers are visible
    entityRects.forEach(e => {
        e.marginTop = e.visibleHeaders * 2 + 1;
    });
}

function calculateGapsAndMargins() {
    // Initialize gap arrays
    rowGaps = [];
    columnGaps = [];

    rowEntities = [];
    columnEntities = [];

    for (let i = 0; i <= w; i++) {
        rowGaps[i] = 1;
        rowEntities[i] = [];
    }

    for (let i = 0; i <= h; i++) {
        columnGaps[i] = 1;
        columnEntities[i] = [];
    }

    // Record on which rows and columns entities start and end
    for (let i = 0; i < entityRects.length; i++) {
        let x1 = entityRects[i].x1;
        let x2 = entityRects[i].x2;
        let y1 = entityRects[i].y1;
        let y2 = entityRects[i].y2;

        rowEntities[x1].push([i, "x1"]);
        rowEntities[x2 + 1].push([i, "x2"]);
        columnEntities[y1].push([i, "y1"]);
        columnEntities[y2 + 1].push([i, "y2"]);
    }

    // Remove default margins from singleton sets
    for (let i = 0; i < entityRects.length; i++) {
        if (entityRects[i].statements.length == 1 && !entityRects[i].deleted.includes(true)) {
            entityRects[i].marginBottom = 0;
            entityRects[i].marginTop = 0;
            entityRects[i].marginRight = 0;
            entityRects[i].marginLeft = 0;
        }
    }

    // Set horizontal entity margins
    for (let i = 0; i < rowEntities.length; i++) {
        for (let j = 0; j < rowEntities[i].length; j++) {
            for (let k = j + 1; k < rowEntities[i].length; k++) {
                // Get entity coordinates
                let firstY1 = entityRects[rowEntities[i][j][0]].y1;
                let firstY2 = entityRects[rowEntities[i][j][0]].y2;

                let secondY1 = entityRects[rowEntities[i][k][0]].y1;
                let secondY2 = entityRects[rowEntities[i][k][0]].y2;

                // Entities overlap
                if ((firstY1 >= secondY1 && firstY1 <= secondY2) || (secondY1 >= firstY1 && secondY1 <= firstY2)) {

                    // Increase the bigger entity's margin
                    if (rowEntities[i][j][1] == "x1" && rowEntities[i][k][1] == "x1" && entityRects[rowEntities[i][k][0]].marginLeft == entityRects[rowEntities[i][j][0]].marginLeft) {
                        if (entityRects[rowEntities[i][k][0]].statements.length > 1) entityRects[rowEntities[i][k][0]].marginLeft = entityRects[rowEntities[i][j][0]].marginLeft + 1;
                    }
                    else if (rowEntities[i][j][1] == "x2" && rowEntities[i][k][1] == "x2" && entityRects[rowEntities[i][k][0]].marginRight == entityRects[rowEntities[i][j][0]].marginRight) {
                        if (entityRects[rowEntities[i][k][0]].statements.length > 1) entityRects[rowEntities[i][k][0]].marginRight = entityRects[rowEntities[i][j][0]].marginRight + 1;
                    }
                }
            }
        }

        // Check and fix any equal margins that resulted from wrong comparison order
        for (let j = 0; j < rowEntities[i].length; j++) {
            for (let k = j + 1; k < rowEntities[i].length; k++) {
                // Get entity coordinates
                let firstY1 = entityRects[rowEntities[i][j][0]].y1;
                let firstY2 = entityRects[rowEntities[i][j][0]].y2;

                let secondY1 = entityRects[rowEntities[i][k][0]].y1;
                let secondY2 = entityRects[rowEntities[i][k][0]].y2;

                // Entities overlap
                if ((firstY1 >= secondY1 && firstY1 <= secondY2) || (secondY1 >= firstY1 && secondY1 <= firstY2)) {

                    // Increase the bigger entity's margin
                    if (rowEntities[i][j][1] == "x1" && rowEntities[i][k][1] == "x1" && entityRects[rowEntities[i][k][0]].marginLeft == entityRects[rowEntities[i][j][0]].marginLeft) {
                        if (entityRects[rowEntities[i][k][0]].statements.length > 1) entityRects[rowEntities[i][k][0]].marginLeft = entityRects[rowEntities[i][j][0]].marginLeft + 1;
                    }
                    else if (rowEntities[i][j][1] == "x2" && rowEntities[i][k][1] == "x2" && entityRects[rowEntities[i][k][0]].marginRight == entityRects[rowEntities[i][j][0]].marginRight) {
                        if (entityRects[rowEntities[i][k][0]].statements.length > 1) entityRects[rowEntities[i][k][0]].marginRight = entityRects[rowEntities[i][j][0]].marginRight + 1;
                    }
                }
            }
        }
    }

    // Set vertical entity margins
    for (let i = 0; i < columnEntities.length; i++) {
        for (let j = 0; j < columnEntities[i].length; j++) {
            for (let k = j + 1; k < columnEntities[i].length; k++) {
                // Get entity coordinates
                let firstX1 = entityRects[columnEntities[i][j][0]].x1;
                let firstX2 = entityRects[columnEntities[i][j][0]].x2;

                let secondX1 = entityRects[columnEntities[i][k][0]].x1;
                let secondX2 = entityRects[columnEntities[i][k][0]].x2;

                // Entities overlap
                if ((firstX1 >= secondX1 && firstX1 <= secondX2) || (secondX1 >= firstX1 && secondX1 <= firstX2)) {

                    // Increase the bigger entity's margin
                    if (columnEntities[i][j][1] == "y1" && columnEntities[i][k][1] == "y1" && Math.abs(entityRects[columnEntities[i][k][0]].marginTop - entityRects[columnEntities[i][j][0]].marginTop) <= entityRects[columnEntities[i][k][0]].visibleHeaders * 2 + 1) {
                        // If their headers overlap, increase (preferably) the bigger entity's top margin such that there is enough space for all its headers
                        if (entityRects[columnEntities[i][k][0]].marginTop - entityRects[columnEntities[i][k][0]].visibleHeaders * 2 >= entityRects[columnEntities[i][j][0]].marginTop - entityRects[columnEntities[i][j][0]].visibleHeaders * 2) {
                            if (entityRects[columnEntities[i][k][0]].statements.length > 1) entityRects[columnEntities[i][k][0]].marginTop = entityRects[columnEntities[i][j][0]].marginTop + entityRects[columnEntities[i][k][0]].visibleHeaders * 2 + 1;
                        }
                        else {
                            // If the smaller entity's header is above the bigger entity's header just increase the smaller entity's header as that's a smaller increase
                            if (entityRects[columnEntities[i][j][0]].statements.length > 1) entityRects[columnEntities[i][j][0]].marginTop = entityRects[columnEntities[i][k][0]].marginTop + entityRects[columnEntities[i][j][0]].visibleHeaders * 2 + 1;
                        }
                    }
                    else if (columnEntities[i][j][1] == "y2" && columnEntities[i][k][1] == "y2" && entityRects[columnEntities[i][k][0]].marginBottom == entityRects[columnEntities[i][j][0]].marginBottom) {
                        if (entityRects[columnEntities[i][k][0]].statements.length > 1) entityRects[columnEntities[i][k][0]].marginBottom = entityRects[columnEntities[i][j][0]].marginBottom + 1;
                    }
                }
            }
        }

        // Check and fix any equal margins that resulted from wrong comparison order
        for (let j = 0; j < columnEntities[i].length; j++) {
            for (let k = j + 1; k < columnEntities[i].length; k++) {
                // Get entity coordinates
                let firstX1 = entityRects[columnEntities[i][j][0]].x1;
                let firstX2 = entityRects[columnEntities[i][j][0]].x2;

                let secondX1 = entityRects[columnEntities[i][k][0]].x1;
                let secondX2 = entityRects[columnEntities[i][k][0]].x2;

                // Entities overlap
                if ((firstX1 >= secondX1 && firstX1 <= secondX2) || (secondX1 >= firstX1 && secondX1 <= firstX2)) {
                    // Increase the bigger entity's margin
                    if (columnEntities[i][j][1] == "y1" && columnEntities[i][k][1] == "y1" && Math.abs(entityRects[columnEntities[i][k][0]].marginTop - entityRects[columnEntities[i][j][0]].marginTop) <= entityRects[columnEntities[i][k][0]].visibleHeaders * 2 + 1) {

                        // If their headers overlap, increase (preferably) the bigger entity's top margin such that there is enough space for all its headers
                        if (entityRects[columnEntities[i][k][0]].marginTop - entityRects[columnEntities[i][k][0]].visibleHeaders * 2 >= entityRects[columnEntities[i][j][0]].marginTop - entityRects[columnEntities[i][j][0]].visibleHeaders * 2) {

                            if (entityRects[columnEntities[i][k][0]].statements.length > 1) {
                                entityRects[columnEntities[i][k][0]].marginTop = entityRects[columnEntities[i][j][0]].marginTop + entityRects[columnEntities[i][k][0]].visibleHeaders * 2 + 1;
                            }
                        }
                        else {
                            // If the smaller entity's header is above the bigger entity's header just increase the smaller entity's header as that's a smaller increase
                            if (entityRects[columnEntities[i][j][0]].statements.length > 1) {
                                entityRects[columnEntities[i][j][0]].marginTop = entityRects[columnEntities[i][k][0]].marginTop + entityRects[columnEntities[i][j][0]].visibleHeaders * 2 + 1;
                            }
                        }
                    }
                    else if (columnEntities[i][j][1] == "y2" && columnEntities[i][k][1] == "y2" && entityRects[columnEntities[i][k][0]].marginBottom == entityRects[columnEntities[i][j][0]].marginBottom) {
                        if (entityRects[columnEntities[i][k][0]].statements.length > 1) entityRects[columnEntities[i][k][0]].marginBottom = entityRects[columnEntities[i][j][0]].marginBottom + 1;
                    }
                }
            }
        }
    }

    // Increase row gaps to fit the highest number of nested entities
    for (let i = 0; i < rowEntities.length; i++) {
        let maxMargin = 0;

        for (let j = 0; j < rowEntities[i].length; j++) {
            for (let k = 0; k < statementCells.length; k++) {
                if (rowEntities[i][j][1] == "x1" && entityRects[rowEntities[i][j][0]].marginLeft > maxMargin) {
                    // Check if there is a statement in the previous column that would overlap with the entity if the gap is not increased
                    let ey1 = entityRects[rowEntities[i][j][0]].y1;
                    let ey2 = entityRects[rowEntities[i][j][0]].y2;
                    let sx = statementCells[k].x;
                    let sy = statementCells[k].y;
                    let statementInPreviousColumn = (sx == i);
                    let statementAndEntityOverlap = (sy <= ey2 && sy >= ey1);

                    // Increase the gap for the first and last column or if such a statement was found
                    if (i == 0 || i == rowEntities.length - 1 || (statementInPreviousColumn && statementAndEntityOverlap)) {
                        maxMargin = entityRects[rowEntities[i][j][0]].marginLeft;
                    }
                }
                else if (rowEntities[i][j][1] == "x2" && entityRects[rowEntities[i][j][0]].marginRight > maxMargin) {
                    // Check if there is a statement in the next column that would overlap with the entity if the gap is not increased
                    let ey1 = entityRects[rowEntities[i][j][0]].y1;
                    let ey2 = entityRects[rowEntities[i][j][0]].y2;
                    let sx = statementCells[k].x;
                    let sy = statementCells[k].y;
                    let statementInNextColumn = (sx == i);
                    let statementAndEntityOverlap = (sy <= ey2 && sy >= ey1);

                    // Increase the gap for the first and last column or if such a statement was found
                    if (i == 0 || i == rowEntities.length - 1 || (statementInNextColumn && statementAndEntityOverlap)) {
                        maxMargin = entityRects[rowEntities[i][j][0]].marginRight;
                    }
                }
            }
        }

        rowGaps[i] += maxMargin;
    }

    // Increase column gaps to fit the highest number of nested entities
    for (let i = 0; i < columnEntities.length; i++) {
        let maxMargin = 0;

        for (let j = 0; j < columnEntities[i].length; j++) {
            for (let k = 0; k < statementCells.length; k++) {
                if (columnEntities[i][j][1] == "y1" && entityRects[columnEntities[i][j][0]].marginTop > maxMargin) {
                    // Check if there is a statement in the previous row that would overlap with the entity if the gap is not increased
                    let ex1 = entityRects[columnEntities[i][j][0]].x1;
                    let ex2 = entityRects[columnEntities[i][j][0]].x2;
                    let sx = statementCells[k].x;
                    let sy = statementCells[k].y;
                    let statementInPreviousRow = (sy == i);
                    let statementAndEntityOverlap = (sx <= ex2 && sx >= ex1);

                    // Increase the gap for the first and last row or if such a statement was found
                    if ((i == 0 || i == columnEntities.length - 1 || (statementInPreviousRow && statementAndEntityOverlap))) {
                        maxMargin = entityRects[columnEntities[i][j][0]].marginTop;
                    }
                }
                else if (columnEntities[i][j][1] == "y2" && entityRects[columnEntities[i][j][0]].marginBottom > maxMargin) {
                    // Check if there is a statement in the next row that would overlap with the entity if the gap is not increased
                    let ex1 = entityRects[columnEntities[i][j][0]].x1;
                    let ex2 = entityRects[columnEntities[i][j][0]].x2;
                    let sx = statementCells[k].x;
                    let sy = statementCells[k].y;
                    let statementInNextRow = (sy == i);
                    let statementAndEntityOverlap = (sx <= ex2 && sx >= ex1);

                    // Increase the gap for the first and last row or if such a statement was found
                    if (i == 0 || i == columnEntities.length - 1 || (statementInNextRow && statementAndEntityOverlap)) {
                        maxMargin = entityRects[columnEntities[i][j][0]].marginBottom;
                    }
                }
            }
        }

        columnGaps[i] += maxMargin;
    }

    // Increase row gaps to fit highest sum of margins from neighbouring columns
    for (let i = 0; i < rowEntities.length; i++) {
        for (let j = 0; j < rowEntities[i].length; j++) {
            for (let k = j + 1; k < rowEntities[i].length; k++) {
                // Get entity coordinates
                let firstY1 = entityRects[rowEntities[i][j][0]].y1;
                let firstY2 = entityRects[rowEntities[i][j][0]].y2;

                let secondY1 = entityRects[rowEntities[i][k][0]].y1;
                let secondY2 = entityRects[rowEntities[i][k][0]].y2;

                // Entities overlap
                if ((firstY1 >= secondY1 && firstY1 <= secondY2) || (secondY1 >= firstY1 && secondY1 <= firstY2)) {

                    // Entities are in two different (neighbouring) columns and the sum of their margins is bigger than the gap
                    if (rowEntities[i][j][1] == "x2" && rowEntities[i][k][1] == "x1" && entityRects[rowEntities[i][k][0]].marginLeft + entityRects[rowEntities[i][j][0]].marginRight >= rowGaps[i]) {
                        // Increase gap to fit the difference
                        rowGaps[i] += entityRects[rowEntities[i][k][0]].marginLeft + entityRects[rowEntities[i][j][0]].marginRight - rowGaps[i] + 1;
                    }
                    else if (rowEntities[i][j][1] == "x1" && rowEntities[i][k][1] == "x2" && entityRects[rowEntities[i][k][0]].marginRight + entityRects[rowEntities[i][j][0]].marginLeft >= rowGaps[i]) {
                        // Increase gap to fit the difference
                        rowGaps[i] += entityRects[rowEntities[i][k][0]].marginRight + entityRects[rowEntities[i][j][0]].marginLeft - rowGaps[i] + 1;
                    }
                }
            }
        }
    }

    // Increase column gaps to fit highest sum of margins from neighbouring rows
    for (let i = 0; i < columnEntities.length; i++) {
        for (let j = 0; j < columnEntities[i].length; j++) {
            for (let k = j + 1; k < columnEntities[i].length; k++) {
                // Get entity coordinates
                let firstX1 = entityRects[columnEntities[i][j][0]].x1;
                let firstX2 = entityRects[columnEntities[i][j][0]].x2;

                let secondX1 = entityRects[columnEntities[i][k][0]].x1;
                let secondX2 = entityRects[columnEntities[i][k][0]].x2;

                // Entities overlap
                if ((firstX1 >= secondX1 && firstX1 <= secondX2) || (secondX1 >= firstX1 && secondX1 <= firstX2)) {

                    // Entities are in two different (neighbouring) rows and the sum of their margins is bigger than the gap
                    if (columnEntities[i][j][1] == "y2" && columnEntities[i][k][1] == "y1" && entityRects[columnEntities[i][k][0]].marginTop + entityRects[columnEntities[i][j][0]].marginBottom >= columnGaps[i]) {
                        // Increase gap to fit the difference
                        columnGaps[i] += entityRects[columnEntities[i][k][0]].marginTop + entityRects[columnEntities[i][j][0]].marginBottom - columnGaps[i] + 1;
                    }
                    else if (columnEntities[i][j][1] == "y1" && columnEntities[i][k][1] == "y2" && entityRects[columnEntities[i][k][0]].marginBottom + entityRects[columnEntities[i][j][0]].marginTop >= columnGaps[i]) {
                        // Increase gap to fit the difference
                        columnGaps[i] += entityRects[columnEntities[i][k][0]].marginBottom + entityRects[columnEntities[i][j][0]].marginTop - columnGaps[i] + 1;
                    }
                }
            }
        }
    }
}

function calculateCellHeights() {
    for (let i = 0; i <= h; i++) {
        cellHeights[i] = 0;
    }

    for (let i = 0; i < statementCells.length; i++) {

        if (statementCells[i].textLines.length > cellHeights[statementCells[i].y]) {
            cellHeights[statementCells[i].y] = statementCells[i].textLines.length;
        }
    }

    for (let i = 0; i <= h; i++) {
        cellHeights[i] += 2;
    }
}

function setCanvasDimensions() {
    let rowGapSum = 0;
    for (const gap of rowGaps) {
        rowGapSum += gap;
    }
    let columnGapSum = 0;
    for (const gap of columnGaps) {
        columnGapSum += gap;
    }

    let sumHeights = 0;
    for (const height of cellHeights) {
        sumHeights += height;
    }

    canvas.width = w * cellWidth * backgroundCellSize + rowGapSum * backgroundCellSize;
    canvas.height = sumHeights * backgroundCellSize + columnGapSum * backgroundCellSize;

    // Cancel centering if solution is too big to fit on the screen
    const rect = canvas.getBoundingClientRect();

    if (rect.left < 10 && rect.top < 30) {
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.style.transform = 'none';
    }
    else if (rect.left < 10) {
        canvas.style.left = '0px';
        canvas.style.transform = 'translateY(-50%)';
    }
    else if (rect.top < 30) {
        canvas.style.top = '0px';
        canvas.style.transform = 'translateX(-50%)';
    }
}

function drawBackgroundGrid() {
    for (var i = backgroundCellSize; i < canvas.width; i += backgroundCellSize) {
        c.strokeStyle = "#dedede";
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, canvas.height);
        c.stroke();
    }

    for (var i = backgroundCellSize; i < canvas.height; i += backgroundCellSize) {
        c.strokeStyle = "#dedede";
        c.beginPath();
        c.moveTo(0, i);
        c.lineTo(canvas.width, i);
        c.stroke();
    }
}

function drawElements() {
    for (let i = 0; i < entityRects.length; i++) {
        entityRects[i].position();
        entityRects[i].draw();
    }
    for (let i = 0; i < entityRects.length; i++) {
        entityRects[i].label();
    }

    for (let i = 0; i < statementCells.length; i++) {
        statementCells[i].position();
        statementCells[i].draw();
    }
}

function reset() {
    // console.log(entityRects);

    // Clear variables
    for (const entity in entityRects) {
        entityRects.pop();
    }

    // Clear previous visualizations
    c.clearRect(0, 0, canvas.width, canvas.height);

    // console.log(entityRects);
}

function visualize() {
    // Reset visualization
    reset();

    // Prepare and process data
    initializeElements();
    mergeEntitiesWithSameStatements();
    markCopiedEntities();
    calculateGapsAndMargins();
    calculateCellHeights();
    setCanvasDimensions();

    // Draw solution
    // drawBackgroundGrid();
    drawElements();
}

function loop() {
    c.clearRect(0, 0, canvas.width, canvas.height);

    // drawBackgroundGrid();
    drawElements();
}


function exportToSVG() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");

    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", canvas.width);
    svg.setAttribute("height", canvas.height);

    // Optional: add white background
    const background = document.createElementNS(svgNS, "rect");
    background.setAttribute("x", 0);
    background.setAttribute("y", 0);
    background.setAttribute("width", canvas.width);
    background.setAttribute("height", canvas.height);
    background.setAttribute("fill", "white");
    svg.appendChild(background);

    // For each entity
    entityRects.forEach(entity => {
        if (entity.statements.length > 1 || entity.deleted.includes(true)) {
            const width = entity.xEnd - entity.xStart;
            const height = entity.yEnd - entity.yStart;

            // Translucent background fill
            const fillRect = document.createElementNS(svgNS, "rect");
            fillRect.setAttribute("x", entity.xStart);
            fillRect.setAttribute("y", entity.yStart);
            fillRect.setAttribute("width", width);
            fillRect.setAttribute("height", height);
            fillRect.setAttribute("fill", rgbToRgba(entity.colors[entity.statements.length > 1 ? 0 : (entity.deleted.includes(true) ? entity.deleted.indexOf(true) : 0)], 0.15));
            svg.appendChild(fillRect);

            // Border
            const border = document.createElementNS(svgNS, "rect");
            border.setAttribute("x", entity.xStart);
            border.setAttribute("y", entity.yStart);
            border.setAttribute("width", width);
            border.setAttribute("height", height);
            border.setAttribute("fill", "none");
            border.setAttribute("stroke", entity.colors[entity.statements.length > 1 ? 0 : (entity.deleted.includes(true) ? entity.deleted.indexOf(true) : 0)]);
            svg.appendChild(border);
        }
    });

    entityRects.forEach(entity => {
        if (entity.statements.length > 1 || entity.deleted.includes(true)) {
            const width = entity.xEnd - entity.xStart;
            const height = entity.yEnd - entity.yStart;

            // Headers
            let headerIndex = 0;
            for (let i = 0; i < entity.headers.length; i++) {
                if (entity.statements.length > 1 || entity.deleted[i]) {
                    const headerY = entity.yStart + 2 * headerIndex * backgroundCellSize;
                    const headerHeight = 2 * backgroundCellSize;

                    // Background rect
                    const headerBg = document.createElementNS(svgNS, "rect");
                    headerBg.setAttribute("x", entity.xStart);
                    headerBg.setAttribute("y", headerY);
                    headerBg.setAttribute("width", width);
                    headerBg.setAttribute("height", headerHeight);
                    headerBg.setAttribute("fill", entity.colors[i]);
                    svg.appendChild(headerBg);

                    // Optional: Crosshatch if marked deleted
                    if (entity.deleted[i]) {
                        const clipId = `clip-${entity.id}-${i}`;

                        // Define a clipping path to restrict hatching to header area
                        const clipPath = document.createElementNS(svgNS, "clipPath");
                        clipPath.setAttribute("id", clipId);

                        const clipRect = document.createElementNS(svgNS, "rect");
                        clipRect.setAttribute("x", entity.xStart);
                        clipRect.setAttribute("y", headerY);
                        clipRect.setAttribute("width", width);
                        clipRect.setAttribute("height", headerHeight);
                        clipPath.appendChild(clipRect);
                        svg.appendChild(clipPath);

                        // Create the group for hatch lines
                        const hatchGroup = document.createElementNS(svgNS, "g");
                        hatchGroup.setAttribute("clip-path", `url(#${clipId})`);
                        hatchGroup.setAttribute("stroke", "white");
                        hatchGroup.setAttribute("stroke-width", "0.75");

                        const spacing = 5;

                        // Forward-slash lines (/)
                        for (let x = -headerHeight; x < width + headerHeight; x += spacing) {
                            const line = document.createElementNS(svgNS, "line");
                            line.setAttribute("x1", entity.xStart + x);
                            line.setAttribute("y1", headerY);
                            line.setAttribute("x2", entity.xStart + x + headerHeight);
                            line.setAttribute("y2", headerY + headerHeight);
                            hatchGroup.appendChild(line);
                        }

                        // Backslash lines (\)
                        for (let x = -headerHeight; x < width + headerHeight; x += spacing) {
                            const line = document.createElementNS(svgNS, "line");
                            line.setAttribute("x1", entity.xStart + x + headerHeight);
                            line.setAttribute("y1", headerY);
                            line.setAttribute("x2", entity.xStart + x);
                            line.setAttribute("y2", headerY + headerHeight);
                            hatchGroup.appendChild(line);
                        }

                        svg.appendChild(hatchGroup);

                        // Redraw borders on top of crosshatching
                        const border = document.createElementNS(svgNS, "rect");
                        border.setAttribute("x", entity.xStart);
                        border.setAttribute("y", entity.yStart);
                        border.setAttribute("width", width);
                        border.setAttribute("height", height);
                        border.setAttribute("fill", "none");
                        border.setAttribute("stroke", entity.colors[entity.statements.length > 1 ? 0 : (entity.deleted.includes(true) ? entity.deleted.indexOf(true) : 0)]);
                        svg.appendChild(border);

                        // Bottom line
                        const bottomLine = document.createElementNS(svgNS, "rect");
                        bottomLine.setAttribute("x", entity.xStart);
                        bottomLine.setAttribute("y", headerY + 2 * backgroundCellSize);
                        bottomLine.setAttribute("width", width);
                        bottomLine.setAttribute("height", 1);
                        bottomLine.setAttribute("fill", entity.colors[i]);
                        svg.appendChild(bottomLine);

                        // Solid rect behind entity name
                        const textWidth = c.measureText(entity.headers[i]).width;
                        const solidBg = document.createElementNS(svgNS, "rect");
                        solidBg.setAttribute("x", entity.xStart);
                        solidBg.setAttribute("y", headerY);
                        solidBg.setAttribute("width", textWidth + 2 * backgroundCellSize);
                        solidBg.setAttribute("height", headerHeight);
                        solidBg.setAttribute("fill", entity.colors[i]);
                        svg.appendChild(solidBg);
                    }

                    // Header text
                    const text = document.createElementNS(svgNS, "text");
                    text.setAttribute("x", entity.xStart + backgroundCellSize + 1);
                    text.setAttribute("y", headerY + 1.25 * backgroundCellSize + 1);
                    text.setAttribute("fill", "white");
                    text.setAttribute("font-size", "10px");
                    text.setAttribute("font-family", "sans-serif");
                    text.textContent = entity.displayHeaders[i];
                    svg.appendChild(text);

                    headerIndex++;
                }
            }
        }
    });

    statementCells.forEach(statement => {
        const xStart = statement.xStart;
        const yStart = statement.yStart;

        // 1. Draw background rectangle
        const bgRect = document.createElementNS(svgNS, "rect");
        bgRect.setAttribute("x", xStart);
        bgRect.setAttribute("y", yStart);
        bgRect.setAttribute("width", backgroundCellSize * cellWidth);
        bgRect.setAttribute("height", backgroundCellSize * cellHeights[statement.y]);
        bgRect.setAttribute("fill", "rgb(255, 255, 255)");
        svg.appendChild(bgRect);

        // 2. Get entity names and their positions
        let namesAndColors = statement.getEntityNamesAndColors();
        let nameIndices = [];

        for (let i = 0; i < namesAndColors.length; i++) {
            nameIndices.push(statement.getIndicesOf(namesAndColors[i][0], statement.text, false));
        }

        let currentIndex = 0;
        let currentNameLength = 0;
        let drawingName = false;
        let lengthSoFar = 0;

        for (let i = 0; i < statement.textLines.length; i++) {
            for (let j = 0; j < statement.textLines[i].length; j++) {

                // Check if we are at the start of an entity name
                for (let k = 0; k < nameIndices.length; k++) {
                    for (let l = 0; l < nameIndices[k].length; l++) {
                        if (currentIndex == nameIndices[k][l]) {
                            fillColor = namesAndColors[k][1];
                            currentNameLength = namesAndColors[k][0].length;
                            drawingName = true;
                            break;
                        }
                    }
                }

                // If we are not drawing a name, use black
                if (!drawingName) fillColor = "#000";

                // If singleton (white), override to black and bold
                let drawingBold = false;
                let fontWeight = "normal";
                if (fillColor == "rgb(255, 255, 255)") {
                    fillColor = "#000";
                    fontWeight = "bolder";
                    drawingBold = true;
                } else if (fillColor !== "#000") {
                    fontWeight = "bold";
                }

                // Draw character as <text>
                const textElem = document.createElementNS(svgNS, "text");
                textElem.setAttribute("x", xStart + backgroundCellSize + lengthSoFar);
                textElem.setAttribute("y", yStart + (2 + i) * backgroundCellSize);
                textElem.setAttribute("font-size", "10px");
                textElem.setAttribute("font-family", "sans-serif");
                textElem.setAttribute("font-weight", fontWeight);
                textElem.setAttribute("fill", fillColor);
                textElem.textContent = statement.textLines[i][j];
                svg.appendChild(textElem);

                // Draw underline
                if (drawingBold && statement.textLines[i][j] !== " ") {
                    const underline = document.createElementNS(svgNS, "line");
                    const width = c.measureText(statement.textLines[i][j]).width + 0.3;
                    underline.setAttribute("x1", xStart + backgroundCellSize + lengthSoFar);
                    underline.setAttribute("x2", xStart + backgroundCellSize + lengthSoFar + width);
                    underline.setAttribute("y1", yStart + (2 + i) * backgroundCellSize + 1);
                    underline.setAttribute("y2", yStart + (2 + i) * backgroundCellSize + 1);
                    underline.setAttribute("stroke", "#000");
                    underline.setAttribute("stroke-width", "1");
                    svg.appendChild(underline);
                }

                // Reset font if needed
                 if (drawingBold) {
                    fillColor = "rgb(255, 255, 255)";
                }

                // Update counters
                if (drawingName) currentNameLength--;
                if (currentNameLength === 0) {
                    drawingName = false;
                    drawingBold = false;
                }
                currentIndex++;
                lengthSoFar += c.measureText(statement.textLines[i][j]).width;
            }

            // Reset length after each line
            lengthSoFar = 0;
        }

    });


    // Serialize and download
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "solution.svg";
    link.click();
}