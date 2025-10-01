// Check if two entities overlap
function doEntitiesOverlap(e1, e2) {
    return !(e1.x1 < e2.x1 || e2.x2 < e1.x1 || e1.y2 < e2.y1 || e2.y2 < e1.y1);
}

// Check only for a vertical rectangle overlap
function doEntitiesOverlapVertically(e1, e2) {
    return (e1.coords[0].y >= e2.coords[0].y && e1.coords[0].y <= e2.coords[e2.coords.length - 1].y) || (e2.coords[0].y >= e1.coords[0].y && e2.coords[0].y <= e1.coords[e1.coords.length - 1].y);
}

// Check only for a horizontal rectangle overlap
function doEntitiesOverlapHorizontally(e1, e2) {
    return (e1.coords[0].x >= e2.coords[0].x && e1.coords[0].x <= e2.coords[e2.coords.length - 1].x) || (e2.coords[0].x >= e1.coords[0].x && e2.coords[0].x <= e1.coords[e1.coords.length - 1].x);
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

function initializeGapAndEntityArrays(width, height, rowGaps, columnGaps, rowSegments, columnSegments) {
    // Initialize column arrays
    for (let i = 0; i <= width; i++) {
        columnGaps[i] = 1;
        columnSegments[i] = [];
    }

    // Initialize row arrays
    for (let i = 0; i <= height; i++) {
        rowGaps[i] = 1;
        rowSegments[i] = [];
    }
}

function calculateGapsAndMargins(entityRects, rowGaps, columnGaps, rowSegments, columnSegments) {
    // Record entity segments in each row and column
    for (let i = 0; i < entityRects.length; i++) {
        // let x1 = entityRects[i].coords[0].x;
        // let x2 = entityRects[i].coords[entityRects[i].coords.length - 1].x;
        // let y1 = entityRects[i].coords[0].y;
        // let y2 = entityRects[i].coords[entityRects[i].coords.length - 1].y;

        // rowSegments[x1].push([i, "x1"]);
        // rowSegments[x2 + 1].push([i, "x2"]);
        // columnSegments[y1].push([i, "y1"]);
        // columnSegments[y2 + 1].push([i, "y2"]);

        // Add segments for each side of the entity
        for (const side in entityRects[i].intervals) {
            for (const interval of entityRects[i].intervals[side]) {
                if (side === 'top') {
                    rowSegments[interval.otherCoord].push(interval);
                } else if (side === 'bottom') {
                    rowSegments[interval.otherCoord + 1].push(interval);
                } else if (side === 'left') {
                    columnSegments[interval.otherCoord].push(interval);
                } else if (side === 'right') {
                    columnSegments[interval.otherCoord + 1].push(interval);
                }
            }
        }
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

    // Set entity margins
    calculateMargins();

    // Set grid gaps
    calculateGaps();


    /* -----------------------------HELPER FUNCTIONS----------------------------- */

    function calculateMargins() {
        for (let i = 0; i < columnSegments.length; i++) {
            calculateHorizontalMargins(i);
            calculateHorizontalMargins(i); // Check and fix any equal margins that resulted from wrong comparison order
        }

        // Set vertical entity margins
        for (let i = 0; i < rowSegments.length; i++) {
            calculateVerticalMargins(i);
            calculateVerticalMargins(i); // Check and fix any equal margins that resulted from wrong comparison order
        }

        function calculateVerticalMargins(i) {
            for (let j = 0; j < rowSegments[i].length; j++) {
                for (let k = j + 1; k < rowSegments[i].length; k++) {
                    // Get segments
                    let s1 = rowSegments[i][j];
                    let s2 = rowSegments[i][k];

                    // Segments overlap
                    if (s1.overlaps(s2)) {

                        // // Increase the bigger entity's margin
                        // if (s1.side == s2.side && s1.side == "top" && Math.abs(s2.margin - s1.margin) <= s2.entity.visibleHeaders * 2 + 1) {
                        //     // If their headers overlap, increase (preferably) the bigger entity's top margin such that there is enough space for all its headers
                        //     if (s2.margin - s2.entity.visibleHeaders * 2 >= s1.margin - s1.entity.visibleHeaders * 2) {
                        //         if (s2.entity.statements.length > 1) s2.margin = s1.margin + s2.entity.visibleHeaders * 2 + 1;
                        //     }
                        //     else {
                        //         // If the smaller entity's header is above the bigger entity's header just increase the smaller entity's header as that's a smaller increase
                        //         if (s1.entity.statements.length > 1) s1.margin = s2.margin + s1.entity.visibleHeaders * 2 + 1;
                        //     }
                        // }
                        if (s1.side == s2.side && s1.margin == s2.margin) {
                            s2.margin = s1.margin + 1;
                        }
                    }
                }
            }
        }

        function calculateHorizontalMargins(i) {
            for (let j = 0; j < columnSegments[i].length; j++) {
                for (let k = j + 1; k < columnSegments[i].length; k++) {
                    // Get segments
                    let s1 = columnSegments[i][j];
                    let s2 = columnSegments[i][k];

                    // Segments overlap
                    if (s1.overlaps(s2)) {

                        // Increase the bigger entity's margin
                        if (s1.side == s2.side && s1.margin == s2.margin) {
                            s2.margin = s1.margin + 1;
                        }
                    }
                }
            }
        }
    }

    function calculateGaps() {
        increaseRowGaps();
        increaseColumnGaps();
    }

    function increaseRowGaps() {
        increaseRowGapsNested();
        increaseRowGapsNeighbouring();
    }

    function increaseColumnGaps() {
        increaseColumnGapsNested();
        increaseColumnGapsNeighbouring();
    }

    // Increase row gaps to fit the highest number of nested entities
    function increaseRowGapsNested() {
        for (let i = 0; i < rowSegments.length; i++) {
            let maxMargin = 0;

            for (let j = 0; j < rowSegments[i].length; j++) {
                for (let k = 0; k < statementCells.length; k++) {
                    let segment = rowSegments[i][j];
                    if (segment.margin > maxMargin) {

                        // Check if there is a statement in the previous row that would overlap with the segment if the gap is not increased
                        let sx = statementCells[k].x;
                        let sy = statementCells[k].y;
                        let statementInPreviousRow = (sy == i);
                        let statementAndEntityOverlap = (sx <= segment.end && sx >= segment.start);

                        // Increase the gap for the first and last row or if such a statement was found
                        if ((i == 0 || i == rowSegments.length - 1 || (statementInPreviousRow && statementAndEntityOverlap))) {
                            maxMargin = segment.margin;
                        }
                    }
                }
            }

            rowGaps[i] += maxMargin;
        }
    }

    // Increase row gaps to fit highest sum of margins from neighbouring rows
    function increaseRowGapsNeighbouring() {
        for (let i = 0; i < rowSegments.length; i++) {
            for (let j = 0; j < rowSegments[i].length; j++) {
                for (let k = j + 1; k < rowSegments[i].length; k++) {
                    // Get segments
                    let s1 = rowSegments[i][j];
                    let s2 = rowSegments[i][k];

                    // Segments overlap
                    if (s1.overlaps(s2)) {

                        // Segments are in two different (neighbouring) rows and the sum of their margins is bigger than the gap
                        if (s1.side != s2.side && s1.margin + s2.margin >= rowGaps[i]) {
                            // Increase gap to fit the difference
                            rowGaps[i] = s1.margin + s2.margin + 1;
                        }
                    }
                }
            }
        }
    }

    // Increase column gaps to fit the highest number of nested entities
    function increaseColumnGapsNested() {
        for (let i = 0; i < columnSegments.length; i++) {
            let maxMargin = 0;

            for (let j = 0; j < columnSegments[i].length; j++) {
                for (let k = 0; k < statementCells.length; k++) {
                    let segment = columnSegments[i][j];
                    if (segment.margin > maxMargin) {

                        // Check if there is a statement in the previous column that would overlap with the segment if the gap is not increased
                        let sx = statementCells[k].x;
                        let sy = statementCells[k].y;
                        let statementInPreviousColumn = (sx == i);
                        let statementAndEntityOverlap = (sy <= segment.end && sy >= segment.start);

                        // Increase the gap for the first and last column or if such a statement was found
                        if (i == 0 || i == columnSegments.length - 1 || (statementInPreviousColumn && statementAndEntityOverlap)) {
                            maxMargin = segment.margin;
                        }
                    }
                }
            }

            columnGaps[i] += maxMargin;
        }
    }

    // Increase column gaps to fit highest sum of margins from neighbouring columns
    function increaseColumnGapsNeighbouring() {
        for (let i = 0; i < columnSegments.length; i++) {
            for (let j = 0; j < columnSegments[i].length; j++) {
                for (let k = j + 1; k < columnSegments[i].length; k++) {
                    // Get segments
                    let s1 = columnSegments[i][j];
                    let s2 = columnSegments[i][k];

                    // Segments overlap
                    if (s1.overlaps(s2)) {

                        // Segments are in two different (neighbouring) columns and the sum of their margins is bigger than the gap
                        if (s1.side != s2.side && s1.margin + s2.margin >= columnGaps[i]) {
                            // Increase gap to fit the difference
                            columnGaps[i] = s1.margin + s2.margin + 1;
                        }
                    }
                }
            }
        }
    }
}

// Set dynamic cell heights for each row
function calculateCellHeights(cellHeights, statementCells, totalHeight) {

    // Initialize all heights to 0
    for (let i = 0; i <= totalHeight; i++) {
        cellHeights[i] = 0;
    }

    for (let i = 0; i < statementCells.length; i++) {
        // Increase the row's cell height to fit a statement that's currently too long
        if (statementCells[i].textLines.length > cellHeights[statementCells[i].y]) {
            cellHeights[statementCells[i].y] = statementCells[i].textLines.length;
        }
    }

    // Add padding above and below the text
    for (let i = 0; i <= totalHeight; i++) {
        cellHeights[i] += 2;
    }
}

// Resize and center canvas on the screen
function setCanvasDimensions(rowGaps, columnGaps, cellHeights) {

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
    canvas.width = solutionWidth * cellWidth * backgroundCellSize + columnGapSum * backgroundCellSize;
    canvas.height = sumHeights * backgroundCellSize + rowGapSum * backgroundCellSize;

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