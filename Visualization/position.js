function getSegments(e1) {
    const segs = [];
    const { top, right, bottom, left } = e1.intervals;

    // Horizontal sides: top & bottom
    for (const s of top) {
        segs.push({ x1: s.start, y1: s.otherCoord, x2: s.end, y2: s.otherCoord });
    }
    for (const s of bottom) {
        segs.push({ x1: s.start, y1: s.otherCoord, x2: s.end, y2: s.otherCoord });
    }

    // Vertical sides: left & right
    for (const s of left) {
        segs.push({ x1: s.otherCoord, y1: s.start, x2: s.otherCoord, y2: s.end });
    }
    for (const s of right) {
        segs.push({ x1: s.otherCoord, y1: s.start, x2: s.otherCoord, y2: s.end });
    }

    return segs;
}

function pointSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(px - x1, py - y1); // degenerate segment

    // projection of point onto segment, clamped 0–1
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.hypot(px - projX, py - projY);
}

function segmentDistance(x1, y1, x2, y2, x3, y3, x4, y4) {
    // endpoints of seg1: (x1,y1)-(x2,y2)
    // endpoints of seg2: (x3,y3)-(x4,y4)
    return Math.min(
        pointSegmentDistance(x1, y1, x3, y3, x4, y4),
        pointSegmentDistance(x2, y2, x3, y3, x4, y4),
        pointSegmentDistance(x3, y3, x1, y1, x2, y2),
        pointSegmentDistance(x4, y4, x1, y1, x2, y2)
    );
}

// TODO: Test the function, print distances between all entities and see if they are accurate
// Calculate polygon distance between entities.
// Note: this function uses the intervals of the entities so make sure that these are computed before using it!
function polygonDistance(e1, e2) {
    // if they overlap distance is 0, for practical reasons it is 1e-6
    if (doEntitiesOverlap(e1, e2)) return 1e-6;

    const segs1 = getSegments(e1);
    const segs2 = getSegments(e2);
    let minDist = Infinity;

    for (const s1 of segs1) {
        for (const s2 of segs2) {
            const d = segmentDistance(s1.x1, s1.y1, s1.x2, s1.y2, s2.x1, s2.y1, s2.x2, s2.y2);
            if (d < minDist) minDist = d;
            if (minDist === 0) return 1e-6; // early exit
        }
    }

    return minDist;
}

// Compute distance between polygons that of repeating entities
function repeatingPolygonsDistance(e1, e2, repeatingMap) {
    distances = []
    if (!repeatingMap.has(e1.headers[0])) { // then e2 repeates
        // compute distances between all polygons of e2 and the polygon of e1
        for (const p2 of repeatingMap.get(e2.headers[0])) {
            distances.push(polygonDistance(e1, p2));
        }
    } else if (!repeatingMap.has(e2.headers[0])) { // then e1 repeats
        // compute distances between all polygons of e1 and the polygon of e2
        for (const p1 of repeatingMap.get(e1.headers[0])) {
            distances.push(polygonDistance(p1, e2));
        }
    } else {
        // both repeat
        for (const p1 of repeatingMap.get(e1.headers[0])) {
            for (const p2 of repeatingMap.get(e2.headers[0])) {
                distances.push(polygonDistance(p1, p2));
            }
        }
    }

    return Math.min(...distances);
}

// Precompute distances between polygons once and use the spatial matrix for every time they are needed
function buildSpatialMatrix(entities, repeatingMap) {
    const n = entities.length;
    const M = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            let ds = 0;
            if (repeatingMap.has(entities[i].headers[0]) || repeatingMap.has(entities[j].headers[0])) {
                ds = repeatingPolygonsDistance(entities[i], entities[j], repeatingMap);
            } else {
                ds = polygonDistance(entities[i], entities[j]);
            }
            M[i][j] = ds;
            M[j][i] = ds; // symmetry
        }
    }
    return M;
}

// Check if two entities overlap, now working for polygons as well
function doEntitiesOverlap(e1, e2) {
    // collect all Y values
    const e1Ys = e1.coords.map(c => c.y);
    const e2Ys = e2.coords.map(c => c.y);

    // find intersection
    const intersectionYs = e1Ys.filter(y => e2Ys.includes(y));

    // for each intersecting y, find xStart and xEnd in both
    for (const y of intersectionYs) {
        // filter all points at this Y for both entities
        const pointsE1 = e1.coords.filter(p => p.y === y);
        const pointsE2 = e2.coords.filter(p => p.y === y);

        // find min and max X for each entity at this row
        const xStartE1 = Math.min(...pointsE1.map(p => p.x));
        const xEndE1 = Math.max(...pointsE1.map(p => p.x));

        const xStartE2 = Math.min(...pointsE2.map(p => p.x));
        const xEndE2 = Math.max(...pointsE2.map(p => p.x));

        // e1 and e2 overlap on row y
        if (!(xEndE1 < xStartE2 || xEndE2 < xStartE1)) {
            return true;
        }
    }

    return false;
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

function calculateGapsAndMargins(entityRects, rowGaps, columnGaps, rowSegments, columnSegments, headersIncluded) {
    // HARDCODED
    let hardcodedEntityRects = [];

    hardcodedEntityRects.push(entityRects.filter(e => e.id == 15)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 20)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 25)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 27)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 18)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 24)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 30)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 32)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 0)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 16)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 23)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 26)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 21)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 28)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 14)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 22)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 3)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 19)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 5)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 2)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 9)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 4)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 7)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 10)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 12)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 8)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 6)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 11)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 1)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 17)[0]);
    hardcodedEntityRects.push(entityRects.filter(e => e.id == 13)[0]);

    for (let i = 0; i < entityRects.length; i++) {
        entityRects[i] = hardcodedEntityRects[i];
    }


    entityRects.reverse();

    // Record entity segments in each row and column
    for (let i = 0; i < entityRects.length; i++) {

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

    // Set entity margins
    calculateMargins(headersIncluded);

    // Set grid gaps
    calculateGaps();

    entityRects.reverse();

    /* -----------------------------HELPER FUNCTIONS----------------------------- */

    function calculateMargins(headersIncluded) {
        // Set horizontal entity margins
        for (let i = 0; i < columnSegments.length; i++) {
            // Check and fix any equal margins that resulted from wrong comparison order
            while (calculateHorizontalMargins(i) > 0) continue;
        }

        // Set vertical entity margins
        for (let i = 0; i < rowSegments.length; i++) {
            // Check and fix any equal margins that resulted from wrong comparison order
            while (calculateVerticalMargins(i, headersIncluded) > 0) continue;
        }

        function calculateVerticalMargins(i, headersIncluded) {
            let changes = 0;
            for (let j = 0; j < rowSegments[i].length; j++) {
                for (let k = j + 1; k < rowSegments[i].length; k++) {
                    // Get segments
                    let s1 = rowSegments[i][j];
                    let s2 = rowSegments[i][k];

                    // Segments overlap
                    if (s1.overlaps(s2)) {

                        if (headersIncluded) {
                            // Handle headers if both are top intervals
                            if (s1.side == s2.side && s1.side == 'top' && ((Math.abs(s2.margin - s1.margin) < (s2.entity.visibleHeaders * 2 + 1) || Math.abs(s2.margin - s1.margin) < (s1.entity.visibleHeaders * 2 + 1)))) {
                                // If their headers overlap, increase (preferably) the bigger entity's top margin such that there is enough space for all its headers
                                if (s2.margin >= s1.margin) {
                                    if (s2.isTopLeft) {
                                        s2.margin = s1.margin + s2.entity.visibleHeaders * 2 + 1;
                                        changes++;
                                    }
                                }
                                else {
                                    // If the smaller entity's header is above the bigger entity's header just increase the smaller entity's header as that's a smaller increase
                                    if (s1.isTopLeft) {
                                        s1.margin = s2.margin + s1.entity.visibleHeaders * 2 + 1;
                                        changes++;
                                    }
                                }
                            }
                        }
                        // Increase the bigger entity's margin
                        if (s1.side == s2.side && s1.margin >= s2.margin) {
                            s2.margin = s1.margin + 1;
                            changes++;
                        }
                    }
                }
            }

            return changes;
        }

        function calculateHorizontalMargins(i) {
            let changes = 0;
            for (let j = 0; j < columnSegments[i].length; j++) {
                for (let k = j + 1; k < columnSegments[i].length; k++) {
                    // Get segments
                    let s1 = columnSegments[i][j];
                    let s2 = columnSegments[i][k];

                    // Segments overlap
                    if (s1.overlaps(s2)) {
                        // Increase the bigger entity's margin
                        if (s1.side == s2.side && s1.margin >= s2.margin) {
                            s2.margin = s1.margin + 1;
                            changes++;
                        }
                    }
                }
            }
            return changes;
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

// Calculate each entity and statement's position
function positionElements(entityRects, statementCells) {
    for (let i = 0; i < entityRects.length; i++) {
        entityRects[i].position();
    }

    for (let i = 0; i < statementCells.length; i++) {
        statementCells[i].position();
    }
}