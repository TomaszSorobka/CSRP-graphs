// Solution
let w;
let h;
let entities = [];
let statements = [];

// Canvas
const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');
c.font = "normal 10px sans-serif";
c.globalCompositeOperation = "source-over";

// Grid sizes
const backgroundCellSize = 10;
let cellWidth = 15; // in background cells
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

// Read solution from input
document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const fileContent = e.target.result;
        parseData(fileContent); // Ensure data is processed first

        visualize(); // Visualize solution
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

    // Modified regex to capture entity data including category:
    // Expected format: "Entity EntityName [Category]: (x1, y1) - (x2, y2)"
    const entityRegex = /Entity (.+?) \[([^\]]+)\]: \((\-?\d+), (\-?\d+)\) - \((\-?\d+), (\-?\d+)\)/g;
    // Regex to capture statement data (unchanged)
    const statementRegex = /Statement (.+?): \((\-?\d+), (\-?\d+)\)/g;
    let match;

    // Extract entities
    while ((match = entityRegex.exec(fileContent)) !== null) {
        let [_, name, category, x1, y1, x2, y2] = match;
        const id = entities.length; // unique ID
        entities.push({
            id,
            name,
            category, // new property
            x1: Number(x1),
            y1: Number(y1),
            x2: Number(x2),
            y2: Number(y2),
            statements: []
        });
    }

    // Extract statements and associate them with entities
    while ((match = statementRegex.exec(fileContent)) !== null) {
        let [_, text, x, y] = match;
        const statementId = statements.length; // unique ID
        const statement = {
            id: statementId,
            text,
            x: Number(x),
            y: Number(y),
            entities: []
        };
        statements.push(statement);

        // Associate this statement with entities whose coordinates match
        entities.forEach(entity => {
            if ((Number(x) >= entity.x1 && Number(x) <= entity.x2) && (Number(y) >= entity.y1 && Number(y) <= entity.y2)) {
                entity.statements.push(statementId);
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
    cellWidth = Math.max(cellWidth, Math.ceil(maxNameLength / backgroundCellSize));

    // After parsing, assign base colors to categories.
    assignCategoryColors();
}

function rgbToHsl([r, g, b]) {
    r /= 255; g /= 255; b /= 255;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: h = ((b - r) / d + 2); break;
            case b: h = ((r - g) / d + 4); break;
        }
        h *= 60;
    }
    return [h, s * 100, l * 100];
}

function hslToRgb([h, s, l]) {
    s /= 100; l /= 100;
    let cVal = (1 - Math.abs(2 * l - 1)) * s;
    let x = cVal * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - cVal / 2;
    let r, g, b;
    if (h < 60) { r = cVal; g = x; b = 0; }
    else if (h < 120) { r = x; g = cVal; b = 0; }
    else if (h < 180) { r = 0; g = cVal; b = x; }
    else if (h < 240) { r = 0; g = x; b = cVal; }
    else if (h < 300) { r = x; g = 0; b = cVal; }
    else { r = cVal; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// Generates far-apart base colors using evenly spaced hues.
function generateFarApartDarkColors(n) {
    let colors = [];
    for (let i = 0; i < n; i++) {
        let hue = (i * 360 / n) % 360;
        // Using saturation 80 and lightness 40 for a dark appearance.
        colors.push(hslToRgb([hue, 80, 30]));
    }
    return colors;
}

let categoryColors = {};
function assignCategoryColors() {
    const categories = [...new Set(entities.map(e => e.category))];
    let baseColors = generateFarApartDarkColors(categories.length);
    categories.forEach((cat, idx) => {
        categoryColors[cat] = baseColors[idx];
    });
}

// Modified getEntityColor function:
function getEntityColor(category, entityIndex, totalCount, statementCount) {
    let baseRGB = categoryColors[category] || [200, 200, 200];
    let [h, s, l] = rgbToHsl(baseRGB);
    // Vary lightness within a range of ±10 (total 20% variation) based on the entity's position in its category
    const variationRange = 20;
    let offset = totalCount > 1 ? (entityIndex / (totalCount - 1)) * variationRange - (variationRange / 2) : 0;
    // Increase brightness and saturation based on extra statements: 3% per extra statement, with caps
    let brightnessIncrease = (statementCount - 1) * 3;
    let saturationIncrease = (statementCount - 1) * 3;
    let newL = Math.min(l + offset + brightnessIncrease, 85); // cap brightness at 85%
    newL = Math.max(0, newL);
    let newS = Math.min(s + saturationIncrease, 100); // cap saturation at 100%
    return hslToRgb([h, newS, newL]);
}




function generateDistinctDarkColors(n) {
    let colors = [];
    let maxAttempts = 1000; // Prevent infinite loops
    let minDist = 50; // Start with a reasonable perceptual distance

    function colorDistance(c1, c2) {
        return Math.sqrt(
            Math.pow(c1[0] - c2[0], 2) +
            Math.pow(c1[1] - c2[1], 2) +
            Math.pow(c1[2] - c2[2], 2)
        );
    }

    function isDistinct(newColor) {
        return colors.every(existing => colorDistance(existing, newColor) > minDist);
    }

    let attempts = 0;

    while (colors.length < n && attempts < maxAttempts) {
        let r = Math.floor(Math.random() * 160) + 30;
        let g = Math.floor(Math.random() * 160) + 30;
        let b = Math.floor(Math.random() * 160) + 30;

        let newColor = [r, g, b];

        if (isDistinct(newColor)) {
            colors.push(newColor);
            attempts = 0; // Reset attempts after success
        } else {
            attempts++;
            if (attempts % 50 === 0) {
                minDist -= 5; // Gradually lower minDist if struggling
            }
        }
    }

    return colors;
}

function initializeElements() {
    let categoryEntityMap = {};
    entities.forEach((e, idx) => {
        if (!categoryEntityMap[e.category]) {
            categoryEntityMap[e.category] = [];
        }
        categoryEntityMap[e.category].push(idx);
    });

    // Updated part of initializeElements():
    for (var i = 0; i < entities.length; i++) {
        let id = entities[i].id;
        let name = entities[i].name;
        let x1 = entities[i].x1;
        let y1 = entities[i].y1;
        let x2 = entities[i].x2;
        let y2 = entities[i].y2;
        let stmts = entities[i].statements;
        let cat = entities[i].category;
        let indexInCategory = categoryEntityMap[cat].indexOf(i);
        let totalInCategory = categoryEntityMap[cat].length;
        let adjustedColor = getEntityColor(cat, indexInCategory, totalInCategory, stmts.length);
        entityRects[i] = new Entity(id, name, x1, y1, x2, y2, adjustedColor, stmts);
    }

    for (var i = 0; i < statements.length; i++) {
        let id = statements[i].id;
        let x = statements[i].x;
        let y = statements[i].y;
        let text = statements[i].text;
        let ents = statements[i].entities;
        statementCells[i] = new Statement(id, x, y, i, text, ents);
    }
}

function mergeEntitiesWithSameStatements() {
    for (let i = 0; i < entityRects.length; i++) {
        for (let j = i + 1; j < entityRects.length; j++) {
            if (entityRects[i].statements.sort().join(',') === entityRects[j].statements.sort().join(',')) {
                entityRects[i].headers.push(entityRects[j].name);
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
        if (entityRects[i].statements.length == 1) {
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
                    if (columnEntities[i][j][1] == "y1" && columnEntities[i][k][1] == "y1" && entityRects[columnEntities[i][k][0]].marginTop - entityRects[columnEntities[i][j][0]].marginTop <= entityRects[columnEntities[i][k][0]].headers.length * 2 + 1) {
                        // If their headers overlap, increase (preferably) the bigger entity's top margin such that there is enough space for all its headers
                        if (entityRects[columnEntities[i][k][0]].marginTop - entityRects[columnEntities[i][k][0]].headers.length * 2 >= entityRects[columnEntities[i][j][0]].marginTop - entityRects[columnEntities[i][j][0]].headers.length * 2) {
                            if (entityRects[columnEntities[i][k][0]].statements.length > 1) entityRects[columnEntities[i][k][0]].marginTop = entityRects[columnEntities[i][j][0]].marginTop + entityRects[columnEntities[i][k][0]].headers.length * 2 + 1;
                        }
                        else {
                            // If the smaller entity's header is above the bigger entity's header just increase the smaller entity's header as that's a smaller increase
                            if (entityRects[columnEntities[i][j][0]].statements.length > 1) entityRects[columnEntities[i][j][0]].marginTop = entityRects[columnEntities[i][k][0]].marginTop + entityRects[columnEntities[i][j][0]].headers.length * 2 + 1;
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
                    if (columnEntities[i][j][1] == "y1" && columnEntities[i][k][1] == "y1" && entityRects[columnEntities[i][k][0]].marginTop - entityRects[columnEntities[i][j][0]].marginTop <= entityRects[columnEntities[i][k][0]].headers.length * 2 + 1) {
                        // If their headers overlap, increase (preferably) the bigger entity's top margin such that there is enough space for all its headers
                        if (entityRects[columnEntities[i][k][0]].marginTop - entityRects[columnEntities[i][k][0]].headers.length * 2 >= entityRects[columnEntities[i][j][0]].marginTop - entityRects[columnEntities[i][j][0]].headers.length * 2) {
                            if (entityRects[columnEntities[i][k][0]].statements.length > 1) entityRects[columnEntities[i][k][0]].marginTop = entityRects[columnEntities[i][j][0]].marginTop + entityRects[columnEntities[i][k][0]].headers.length * 2 + 1;
                        }
                        else {
                            // If the smaller entity's header is above the bigger entity's header just increase the smaller entity's header as that's a smaller increase
                            if (entityRects[columnEntities[i][j][0]].statements.length > 1) entityRects[columnEntities[i][j][0]].marginTop = entityRects[columnEntities[i][k][0]].marginTop + entityRects[columnEntities[i][j][0]].headers.length * 2 + 1;
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

                    // if (statementAndEntityOverlap && statementInNextRow) console.log(statementCells[k].id + " " + entityRects[columnEntities[i][j][0]].name);
                    if (statementInNextRow) console.log(statementCells[k].id + " " + entityRects[columnEntities[i][j][0]].name + " " + i);

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
    calculateGapsAndMargins();
    calculateCellHeights();
    setCanvasDimensions();

    // Draw solution
    // drawBackgroundGrid();
    drawElements();
}