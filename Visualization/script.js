// Solution
let w;
let h;
let entities = [];
let statements = [];

// Canvas
const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');

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

    // Regex to capture entity data (including names and coordinates)
    const entityRegex = /Entity (.+?): \((\-?\d+), (\-?\d+)\) - \((\-?\d+), (\-?\d+)\)/g;
    // Regex to capture statement data (including text and single coordinates)
    const statementRegex = /Statement (.+?): \((\-?\d+), (\-?\d+)\)/g;

    let match;

    // Extract entities
    while ((match = entityRegex.exec(fileContent)) !== null) {
        let [_, name, x1, y1, x2, y2] = match;
        entities.push({ name, x1: Number(x1), y1: Number(y1), x2: Number(x2), y2: Number(y2) });
    }

    // Extract statements
    while ((match = statementRegex.exec(fileContent)) !== null) {
        let [_, text, x, y] = match;
        statements.push({ text, x: Number(x), y: Number(y) });
    }

    // Sort entities by size
    entities.sort((a, b) => ((a.x2 - a.x1) + (a.y2 - a.y1)) - ((b.x2 - b.x1) + (b.y2 - b.y1)));
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
    let colors = generateDistinctDarkColors(entities.length);

    for (var i = 0; i < entities.length; i++) {
        let x = entities[i].x1;
        let y = entities[i].y1;
        let width = entities[i].x2 - entities[i].x1;
        let height = entities[i].y2 - entities[i].y1;
        entityRects[i] = new Entity(x, y, i, width, height, colors[i]);
    }

    for (var i = 0; i < statements.length; i++) {
        let x = statements[i].x;
        let y = statements[i].y;
        let text = statements[i].text;
        statementCells[i] = new Statement(x, y, i, text);
    }
}

function calculateGapsAndMargins() {
    // Initialize gap arrays
    rowGaps = [];
    columnGaps = [];

    rowEntities = [];
    columnEntities = [];

    for (let i = 0; i <= w; i++) {
        rowGaps[i] = 2;
        rowEntities[i] = [];
    }

    for (let i = 0; i <= h; i++) {
        columnGaps[i] = 2;
        columnEntities[i] = [];
    }

    // Record on which rows and columns entities start and end
    for (let i = 0; i < entities.length; i++) {
        let x1 = parseInt(entities[i].x1);
        let x2 = parseInt(entities[i].x2);
        let y1 = parseInt(entities[i].y1);
        let y2 = parseInt(entities[i].y2);

        rowEntities[x1].push([i, "x1"]);
        rowEntities[x2 + 1].push([i, "x2"]);
        columnEntities[y1].push([i, "y1"]);
        columnEntities[y2 + 1].push([i, "y2"]);
    }

    // Set vertical entity margins
    for (let i = 0; i < rowEntities.length; i++) {
        for (let j = 0; j < rowEntities[i].length; j++) {
            for (let k = j + 1; k < rowEntities[i].length; k++) {
                // Get entity coordinates
                let firstY1 = parseInt(entities[rowEntities[i][j][0]].y1);
                let firstY2 = parseInt(entities[rowEntities[i][j][0]].y2);

                let secondY1 = parseInt(entities[rowEntities[i][k][0]].y1);
                let secondY2 = parseInt(entities[rowEntities[i][k][0]].y2);

                // Entities overlap
                if ((firstY1 >= secondY1 && firstY1 <= secondY2) || (secondY1 >= firstY1 && secondY1 <= firstY2)) {

                    // Increase the bigger entity's margin
                    if (rowEntities[i][j][1] == "x1" && rowEntities[i][k][1] == "x1" && entityRects[rowEntities[i][k][0]].marginLeft == entityRects[rowEntities[i][j][0]].marginLeft) {
                        entityRects[rowEntities[i][k][0]].marginLeft = entityRects[rowEntities[i][j][0]].marginLeft + 1;
                    }
                    else if (rowEntities[i][j][1] == "x2" && rowEntities[i][k][1] == "x2" && entityRects[rowEntities[i][k][0]].marginRight == entityRects[rowEntities[i][j][0]].marginRight) {
                        entityRects[rowEntities[i][k][0]].marginRight = entityRects[rowEntities[i][j][0]].marginRight + 1;
                    }       
                }
            }
        }     
        
        // Check and fix any equal margins that resulted from wrong comparison order
        for (let j = 0; j < rowEntities[i].length; j++) {
            for (let k = j + 1; k < rowEntities[i].length; k++) {
                // Get entity coordinates
                let firstY1 = parseInt(entities[rowEntities[i][j][0]].y1);
                let firstY2 = parseInt(entities[rowEntities[i][j][0]].y2);

                let secondY1 = parseInt(entities[rowEntities[i][k][0]].y1);
                let secondY2 = parseInt(entities[rowEntities[i][k][0]].y2);

                // Entities overlap
                if ((firstY1 >= secondY1 && firstY1 <= secondY2) || (secondY1 >= firstY1 && secondY1 <= firstY2)) {

                    // Increase the bigger entity's margin
                    if (rowEntities[i][j][1] == "x1" && rowEntities[i][k][1] == "x1" && entityRects[rowEntities[i][k][0]].marginLeft == entityRects[rowEntities[i][j][0]].marginLeft) {
                        entityRects[rowEntities[i][k][0]].marginLeft = entityRects[rowEntities[i][j][0]].marginLeft + 1;
                    }
                    else if (rowEntities[i][j][1] == "x2" && rowEntities[i][k][1] == "x2" && entityRects[rowEntities[i][k][0]].marginRight == entityRects[rowEntities[i][j][0]].marginRight) {
                        entityRects[rowEntities[i][k][0]].marginRight = entityRects[rowEntities[i][j][0]].marginRight + 1;
                    }       
                }
            }
        }  
    }

    // Set horizontal entity margins
    for (let i = 0; i < columnEntities.length; i++) {
        for (let j = 0; j < columnEntities[i].length; j++) {
            for (let k = j + 1; k < columnEntities[i].length; k++) {
                // Get entity coordinates
                let firstX1 = parseInt(entities[columnEntities[i][j][0]].x1);
                let firstX2 = parseInt(entities[columnEntities[i][j][0]].x2);

                let secondX1 = parseInt(entities[columnEntities[i][k][0]].x1);
                let secondX2 = parseInt(entities[columnEntities[i][k][0]].x2);

                // Entities overlap
                if ((firstX1 >= secondX1 && firstX1 <= secondX2) || (secondX1 >= firstX1 && secondX1 <= firstX2)) {

                    // Increase the bigger entity's margin
                    if (columnEntities[i][j][1] == "y1" && columnEntities[i][k][1] == "y1" && entityRects[columnEntities[i][k][0]].marginTop == entityRects[columnEntities[i][j][0]].marginTop) {
                        entityRects[columnEntities[i][k][0]].marginTop = entityRects[columnEntities[i][j][0]].marginTop + 3;
                    }
                    else if (columnEntities[i][j][1] == "y2" && columnEntities[i][k][1] == "y2" && entityRects[columnEntities[i][k][0]].marginBottom == entityRects[columnEntities[i][j][0]].marginBottom) {
                        entityRects[columnEntities[i][k][0]].marginBottom = entityRects[columnEntities[i][j][0]].marginBottom + 1;
                    }        
                }
            }
        }  
        
        // Check and fix any equal margins that resulted from wrong comparison order
        for (let j = 0; j < columnEntities[i].length; j++) {
            for (let k = j + 1; k < columnEntities[i].length; k++) {
                // Get entity coordinates
                let firstX1 = parseInt(entities[columnEntities[i][j][0]].x1);
                let firstX2 = parseInt(entities[columnEntities[i][j][0]].x2);

                let secondX1 = parseInt(entities[columnEntities[i][k][0]].x1);
                let secondX2 = parseInt(entities[columnEntities[i][k][0]].x2);

                // Entities overlap
                if ((firstX1 >= secondX1 && firstX1 <= secondX2) || (secondX1 >= firstX1 && secondX1 <= firstX2)) {

                    // Increase the bigger entity's margin
                    if (columnEntities[i][j][1] == "y1" && columnEntities[i][k][1] == "y1" && entityRects[columnEntities[i][k][0]].marginTop == entityRects[columnEntities[i][j][0]].marginTop) {
                        entityRects[columnEntities[i][k][0]].marginTop = entityRects[columnEntities[i][j][0]].marginTop + 3;
                    }
                    else if (columnEntities[i][j][1] == "y2" && columnEntities[i][k][1] == "y2" && entityRects[columnEntities[i][k][0]].marginBottom == entityRects[columnEntities[i][j][0]].marginBottom) {
                        entityRects[columnEntities[i][k][0]].marginBottom = entityRects[columnEntities[i][j][0]].marginBottom + 1;
                    }        
                }
            }
        }       
    }

    // Increase row gaps to fit the highest number of nested entities
    for (let i = 0; i < rowEntities.length; i++) {
        let maxMargin = 0;

        for (let j = 0; j < rowEntities[i].length; j++) {
            if (rowEntities[i][j][1] == "x1" && entityRects[rowEntities[i][j][0]].marginLeft > maxMargin) {
                maxMargin = entityRects[rowEntities[i][j][0]].marginLeft;
            }
            else if (rowEntities[i][j][1] == "x2" && entityRects[rowEntities[i][j][0]].marginRight > maxMargin) {
                maxMargin = entityRects[rowEntities[i][j][0]].marginRight;
            }
        }  
        
        rowGaps[i] += maxMargin;
    }

    // Increase column gaps to fit the highest number of nested entities
    for (let i = 0; i < columnEntities.length; i++) {
        let maxMargin = 0;

        for (let j = 0; j < columnEntities[i].length; j++) {
            if (columnEntities[i][j][1] == "y1" && entityRects[columnEntities[i][j][0]].marginTop > maxMargin) {
                maxMargin = entityRects[columnEntities[i][j][0]].marginTop;
            }
            else if (columnEntities[i][j][1] == "y2" && entityRects[columnEntities[i][j][0]].marginBottom > maxMargin) {
                maxMargin = entityRects[columnEntities[i][j][0]].marginBottom;
            }
        }  
        
        columnGaps[i] += maxMargin;
    }

    // Increase row gaps to fit highest sum of margins from neighbouring columns
    for (let i = 0; i < rowEntities.length; i++) {
        for (let j = 0; j < rowEntities[i].length; j++) {
            for (let k = j + 1; k < rowEntities[i].length; k++) {
                // Get entity coordinates
                let firstY1 = parseInt(entities[rowEntities[i][j][0]].y1);
                let firstY2 = parseInt(entities[rowEntities[i][j][0]].y2);

                let secondY1 = parseInt(entities[rowEntities[i][k][0]].y1);
                let secondY2 = parseInt(entities[rowEntities[i][k][0]].y2);

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
                let firstX1 = parseInt(entities[columnEntities[i][j][0]].x1);
                let firstX2 = parseInt(entities[columnEntities[i][j][0]].x2);

                let secondX1 = parseInt(entities[columnEntities[i][k][0]].x1);
                let secondX2 = parseInt(entities[columnEntities[i][k][0]].x2);

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
    console.log(entityRects);

    // Clear variables
    for (const entity in entityRects) {
        entityRects.pop();
    }

    // Clear previous visualizations
    c.clearRect(0, 0, canvas.width, canvas.height);

    console.log(entityRects);
}

function visualize() {
    // Reset visualization
    reset();

    // Prepare and process data
    initializeElements();
    calculateGapsAndMargins();
    calculateCellHeights();
    setCanvasDimensions();

    // Draw solution
    // drawBackgroundGrid();
    drawElements();
}