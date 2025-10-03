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
let rowSegments = [];
let columnSegments = [];

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
        setInterval(visualize, 10); // Show the solution
    };
    reader.readAsText(file);
});

function parseData(fileContent) {
    // --- Extract type ---
    const typeRegex = /type:\s*(\w+)/;
    const typeMatch = fileContent.match(typeRegex);
    let type = null;
    if (typeMatch) {
        type = typeMatch[1].trim();
    }

    // --- Extract width and height ---
    const sizeRegex = /w:\s*(\d+)\s*\n\s*h:\s*(\d+)/;
    const sizeMatch = fileContent.match(sizeRegex);

    if (sizeMatch) {
        solutionWidth = parseInt(sizeMatch[1], 10) + 1;
        solutionHeight = parseInt(sizeMatch[2], 10) + 1;
    }

    initializeGapAndEntityArrays(
        solutionWidth,
        solutionHeight,
        rowGaps,
        columnGaps,
        rowEntities,
        columnEntities
    );

    // --- Regex to capture entity lines ---
    // Rectangles: "Entity Name: (x1, y1) - (x2, y2)"
    const rectEntityRegex = /Entity (.+?): \((\-?\d+), (\-?\d+)\) - \((\-?\d+), (\-?\d+)\)/g;

    // Polygons: "Entity Name: (x, y) - (x, y) - (x, y)..."
    const polyEntityRegex = /Entity (.+?): ((?:\(\-?\d+, \-?\d+\)(?:\s*-\s*\(\-?\d+, \-?\d+\))*)+)/g;

    // Statements (same across both types)
    const statementRegex = /Statement (.+?): \((\-?\d+), (\-?\d+)\)/g;

    let match;

    // --- Extract entities ---
    if (type === "rectangles") {
        while ((match = rectEntityRegex.exec(fileContent)) !== null) {
            let [_, name, x1, y1, x2, y2] = match;
            const id = entities.length;
            const coords = [
                new Point(Number(x1), Number(y1)),
                new Point(Number(x2), Number(y1)),
                new Point(Number(x1), Number(y2)),
                new Point(Number(x2), Number(y2)),
            ];
            entities.push({
                id,
                name,
                coords,
                statements: []
            });
        }
    } else if (type === "polygons") {
        while ((match = polyEntityRegex.exec(fileContent)) !== null) {
            let [_, name, coordString] = match;
            const id = entities.length;

            // Parse all (x,y) pairs in the list
            const coordRegex = /\((\-?\d+), (\-?\d+)\)/g;
            let coords = [];
            let cMatch;
            while ((cMatch = coordRegex.exec(coordString)) !== null) {
                coords.push(new Point(Number(cMatch[1]), Number(cMatch[2])));
            }

            entities.push({
                id,
                name,
                coords,
                statements: []
            });
        }
    }

    // --- Extract statements ---
    while ((match = statementRegex.exec(fileContent)) !== null) {
        let [_, text, x, y] = match;
        const statementId = statements.length;
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
            if (y >= entity.coords[0].y && y <= entity.coords[entity.coords.length - 1].y) {
                for (let i = 0; i < entity.coords.length - 1; i++) {
                    if (y == entity.coords[i].y && x >= entity.coords[i].x && x <= entity.coords[i + 1].x) {
                        entity.statements.push(statementId); // Add statement ID to the entity's list of statements
                        break;
                    }
                }
            }
        });
    }

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

    // Make the Export button functional
    document.getElementById("export").addEventListener("click", () => exportToSVG());
}

// Clear and redraw solution to show changes
function visualize() {
    c.clearRect(0, 0, canvas.width, canvas.height);

    drawBackgroundGrid();
    drawElements(entityRects, statementCells);
}