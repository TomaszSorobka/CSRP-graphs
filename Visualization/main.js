// Solution
let solutionWidth;
let solutionHeight;
let entities = [];
let statements = [];

// Names of copied entities
let copiedEntityNames;
// Colors for copied entities
let copiedEntityColors;

// Canvas
const canvas = document.getElementById('canvas');
const c = canvas.getContext('2d');
c.font = "normal 10px sans-serif";
c.globalCompositeOperation = "source-over";

// Canvas elements to be drawn
let entityRects = [];
let statementCells = [];

// Grid sizes
const backgroundCellSize = 10;
let cellWidth = 20; // In background cells
let cellHeights = []; // In background cells

// The gaps for each row and column
let rowGaps = [];
let columnGaps = [];

// Entities which start or end at each row and column
let rowEntities = [];
let columnEntities = [];

// All available colors
const colors = [
    "#4E79A7",
    "#F28E2B",
    "#E15759",
    "#76B7B2",
    "#59A14F",
    "#EDC948",
    "#B07AA1",
    "#FF9DA7",
    "#9C755F",
    "#BAB0AC"
];

// Color palette to be used for the current visualization
let colorPalette = colors.slice();

// Read solution from input
document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    reset(); // Clear any previous visuazliations

    const reader = new FileReader();
    reader.onload = function (e) {
        const fileContent = e.target.result;
        parseData(fileContent); // Ensure data is processed first

        setup(); // Compute visualization
        setInterval(visualize, 0.1); // Show the solution
    };
    reader.readAsText(file);
});

function parseData(fileContent) {
    // Extract width and height
    const sizeRegex = /w:\s*(\d+)\s*\n\s*h:\s*(\d+)/;
    const sizeMatch = fileContent.match(sizeRegex);

    if (sizeMatch) {
        solutionWidth = parseInt(sizeMatch[1], 10) + 1;
        solutionHeight = parseInt(sizeMatch[2], 10) + 1;
    }

    initializeGapAndEntityArrays(solutionWidth, solutionHeight, rowGaps, columnGaps, rowEntities, columnEntities);

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

    // Find the names of all entities with multiple copies
    copiedEntityNames = getCopiedEntities(entities);

    // Assign a unique color for each deleted entity
    let nrDeleted = copiedEntityNames.length;
    copiedEntityColors = getReadyPalette(colorPalette, nrDeleted, true);
    
    // Remove assigned colors from the palette
    colorPalette.splice(0, nrDeleted);
}

// Clear previous visualizations
function reset() {
    // Reset the canvas
    canvas.width = 0;
    canvas.height = 0;
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';

    // Clear the previous solution
    solutionWidth = undefined;
    solutionHeight = undefined;
    entities = [];
    statements = [];
    copiedEntityNames = undefined;
    copiedEntityColors = undefined;

    // Clear previous elements and dimensions
    entityRects = [];
    statementCells = [];
    cellHeights = [];
    rowGaps = [];
    columnGaps = [];
    rowEntities = [];
    columnEntities = [];

    // Reset the color palette
    colorPalette = colors.slice();
}

// Prepare and process data
function setup() {
    // Initialize the elements to be drawn on screen from the data
    initializeElements(colorPalette, entities, statements, entityRects, statementCells);

    // Prepare entity rectangles to be drawn
    mergeEntityRectsWithSameStatements(entityRects);
    mapEntityRectsToStatements(entityRects, statements);
    processEntityRectHeaders(entityRects, copiedEntityNames);

    // Calculate and set pixel dimensions
    calculateGapsAndMargins(entityRects, rowGaps, columnGaps, rowEntities, columnEntities);
    calculateCellHeights(cellHeights, statementCells, solutionHeight);
    setCanvasDimensions(rowGaps, columnGaps, cellHeights);

    drawElements(entityRects, statementCells);

    // Make the Export button functional
    document.getElementById("export").addEventListener("click", () => exportToSVG());
}

// Clear and redraw solution to show changes
function visualize() {
    c.clearRect(0, 0, canvas.width, canvas.height);

    drawBackgroundGrid();
    drawElements(entityRects, statementCells);
}