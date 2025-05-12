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
let cellWidth = 20; // In background cells
let cellHeights = []; // In background cells

// The gaps for each row and column
let rowGaps = [];
let columnGaps = [];

// Entities which start or end at each row and column
let rowEntities = [];
let columnEntities = [];

// Canvas elements to be drawn
let entityRects = [];
let statementCells = [];

// Color palette
let readyPalette = [
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

// Colors for copied entities
let deletedColors;

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

    // Assign a unique color for each deleted entity
    let nrDeleted = getNumberOfCopiedEntities(entities);
    deletedColors = getReadyPalette(nrDeleted, true);
    
    // Remove assigned colors from the palette
    readyPalette.splice(0, nrDeleted);
}

function getNumberOfCopiedEntities(entities) {
    let repeated = [];
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            if (entities[i].name == entities[j].name && !repeated.includes(entities[i].name)) {
                repeated.push(entities[i].name);
            }
        }
    }

    return repeated.length;
}

function visualize() {
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

// Clear and redraw solution to show changes
function loop() {
    c.clearRect(0, 0, canvas.width, canvas.height);

    // drawBackgroundGrid();
    drawElements();
}