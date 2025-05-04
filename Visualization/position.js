// Check if two rectangles (entities) overlap
function doEntitiesOverlap(e1, e2) {
    return !(e1.x2 < e2.x1 || e2.x2 < e1.x1 || e1.y2 < e2.y1 || e2.y2 < e1.y1);
}

// Build an overlap graph: graph[i] is an array of indices of entities overlapping with entity i
function buildOverlapGraph(entities) {
    let n = entities.length;
    let graph = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (doEntitiesOverlap(entities[i], entities[j])) {
                graph[i].push(j);
                graph[j].push(i);
            }
        }
    }
    return graph;
}

function calculateGapsAndMargins() {
    // Gap arrays
    rowGaps = [];
    columnGaps = [];

    // Store which entities start and end on every row and column
    rowEntities = [];
    columnEntities = [];

    // Initialize row arrays
    for (let i = 0; i <= w; i++) {
        rowGaps[i] = 1;
        rowEntities[i] = [];
    }

    // Initialize column arrays
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

// Set dynamic cell heights for each row
function calculateCellHeights() {

    // Initialize all heights to 0
    for (let i = 0; i <= h; i++) {
        cellHeights[i] = 0;
    }

    for (let i = 0; i < statementCells.length; i++) {
        // Increase the row's cell height to fit a statement that's currently too long
        if (statementCells[i].textLines.length > cellHeights[statementCells[i].y]) {
            cellHeights[statementCells[i].y] = statementCells[i].textLines.length;
        }
    }

    // Add padding above and below the text
    for (let i = 0; i <= h; i++) {
        cellHeights[i] += 2;
    }
}

// Resize and center canvas on the screen
function setCanvasDimensions() {

    // Sum over all gaps
    let rowGapSum = 0;
    for (const gap of rowGaps) {
        rowGapSum += gap;
    }
    let columnGapSum = 0;
    for (const gap of columnGaps) {
        columnGapSum += gap;
    }

    // Get the combined cell height of all rows
    let sumHeights = 0;
    for (const height of cellHeights) {
        sumHeights += height;
    }

    // Combine into total canvas dimensions
    canvas.width = w * cellWidth * backgroundCellSize + rowGapSum * backgroundCellSize;
    canvas.height = sumHeights * backgroundCellSize + columnGapSum * backgroundCellSize;

    // Cancel centering if solution is too big to fit on the screen
    const rect = canvas.getBoundingClientRect();

    // Too large horizontally and vertically
    if (rect.left < 10 && rect.top < 30) {
        canvas.style.left = '0px';
        canvas.style.top = '0px';
        canvas.style.transform = 'none';
    }
    // Too large horizontally
    else if (rect.left < 10) {
        canvas.style.left = '0px';
        canvas.style.transform = 'translateY(-50%)';
    }
    // Too large vertically
    else if (rect.top < 30) {
        canvas.style.top = '0px';
        canvas.style.transform = 'translateX(-50%)';
    }
}