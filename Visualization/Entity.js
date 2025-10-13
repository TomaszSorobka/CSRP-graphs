class Entity {
    constructor(id, name, coords, color, statements, headersIncluded) {
        // Identifiers
        this.id = id;
        this.statements = statements;

        // Cell coordinates
        this.coords = coords;

        // Cell dimensions
        this.computeDimensions();

        // Intervals for each side
        this.intervals = { top: [], right: [], bottom: [], left: [] };
        this.computeIntervals(headersIncluded);

        // Pixel coordinates
        this.pixelCoords = [];

        // Header names and their colors
        this.headers = [name];
        this.colors = [color];

        // Visible versions for all headers
        this.displayHeaders = [];

        // Boolean array showing which headers are for copied entities
        this.deleted = [];

        // Boolean specifying if an entity rectangle should be drawn
        this.singleton = false;
    }

    computeDimensions() {
        let tempCoords = this.coords.slice();

        // Sort corner points based on their x coordinate
        tempCoords.sort((a, b) => a.x - b.x);
        // Find the largest difference
        this.width = tempCoords[tempCoords.length - 1].x - tempCoords[0].x;

        // Sort corner points based on their y coordinate
        tempCoords.sort((a, b) => a.y - b.y);
        // Find the largest difference
        this.height = tempCoords[tempCoords.length - 1].y - tempCoords[0].y;
    }

    computeIntervals(headersIncluded) {
        // Calculate top and bottom intervals
        let topIntervals = [new Interval(this.coords[0].x, this.coords[1].x, this.coords[0].y, 'top', this)];
        let bottomIntervals = [new Interval(this.coords[this.coords.length - 2].x, this.coords[this.coords.length - 1].x, this.coords[this.coords.length - 2].y, 'bottom', this)];

        let globalStart, globalEnd;

        // Top intervals
        globalStart = topIntervals[0].start;
        globalEnd = topIntervals[0].end;
        for (let i = 2; i < this.coords.length; i += 2) {
            // Check if this row starts before the earliest recorded start so far
            if (this.coords[i].x < globalStart) {
                let start = this.coords[i].x;
                let end = globalStart - 1;
                topIntervals.push(new Interval(start, end, this.coords[i].y, 'top', this));
                globalStart = start;
            }

            // Check if this row ends after the latest recorded end so far
            if (this.coords[i + 1].x > globalEnd) {
                let start = globalEnd + 1;
                let end = this.coords[i + 1].x;
                topIntervals.push(new Interval(start, end, this.coords[i + 1].y, 'top', this));
                globalEnd = end;
            }
        }

        // Bottom intervals
        globalStart = bottomIntervals[0].start;
        globalEnd = bottomIntervals[0].end;
        for (let i = this.coords.length - 4; i >= 0; i -= 2) {
            // Check if this row starts before the earliest recorded start so far
            if (this.coords[i].x < globalStart) {
                let start = this.coords[i].x;
                let end = globalStart - 1;
                bottomIntervals.push(new Interval(start, end, this.coords[i].y, 'bottom', this));
                globalStart = start;
            }
            // Check if this row ends after the latest recorded end so far
            if (this.coords[i + 1].x > globalEnd) {
                let start = globalEnd + 1;
                let end = this.coords[i + 1].x;
                bottomIntervals.push(new Interval(start, end, this.coords[i + 1].y, 'bottom', this));
                globalEnd = end;
            }
        }

        // Add calculated top and bottom intervals to the entity
        this.intervals.top = topIntervals;
        this.intervals.bottom = bottomIntervals;

        // Calculate left and right intervals
        let start, end, x;

        // Left intervals
        start = this.coords[0].y;
        x = this.coords[0].x;
        for (let i = 2; i < this.coords.length; i += 2) {
            // Check if the next row starts at a different x coordinate
            if (this.coords[i].x != x) {
                end = this.coords[i - 2].y;
                this.intervals.left.push(new Interval(start, end, x, 'left', this));
                start = this.coords[i].y;
                x = this.coords[i].x;
            }
        }

        // Add the last left interval
        end = this.coords[this.coords.length - 1].y;
        this.intervals.left.push(new Interval(start, end, x, 'left', this));

        // Right intervals
        start = this.coords[1].y;
        x = this.coords[1].x;
        for (let i = 3; i < this.coords.length; i += 2) {
            // Check if the next row starts at a different x coordinate
            if (this.coords[i].x != x) {
                end = this.coords[i - 2].y;
                this.intervals.right.push(new Interval(start, end, x, 'right', this));
                start = this.coords[i].y;
                x = this.coords[i].x;
            }
        }
        // Add the last right interval
        end = this.coords[this.coords.length - 1].y;
        this.intervals.right.push(new Interval(start, end, x, 'right', this));

        // Set the top-left interval if headers are drawn
        this.intervals.top[0].setTopLeft(true, headersIncluded);

        // Sort intervals on each side by their starting coordinate
        this.intervals.top.sort((a, b) => a.start - b.start);
        this.intervals.right.sort((a, b) => a.start - b.start);
        this.intervals.bottom.sort((a, b) => a.start - b.start);
        this.intervals.left.sort((a, b) => a.start - b.start);
    }

    position() {
        // Clear any previously calculated pixel dimensions
        this.pixelCoords = [];

        class Side {
            constructor(start, end) {
                this.start = start; // Start point
                this.end = end;     // End point
            }
        }
        // Store the sides of the polygon
        let sides = [];

        for (let i = 0; i < this.intervals['top'].length; i++) {
            let interval = this.intervals['top'][i];
            // Find the y
            // Sum up the cell heights of every row above this segment
            let combinedPreviousCellHeight = 0;
            for (let j = 0; j < interval.otherCoord; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }
            let y = backgroundCellSize * combinedPreviousCellHeight;

            // Sum up all row gaps before this row (exclusive)
            let cumulativeRowGap = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                cumulativeRowGap += rowGaps[j];
            }
            y += cumulativeRowGap * backgroundCellSize;
            y -= backgroundCellSize * interval.margin;

            interval.setOther(y);
        }

        // Go through right segments
        for (let i = 0; i < this.intervals['right'].length; i++) {
            let interval = this.intervals['right'][i];

            // Find the x
            let x = (interval.otherCoord + 1) * backgroundCellSize * cellWidth;

            // Sum up all column gaps before this column
            let cumulativeColumnGap = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                cumulativeColumnGap += columnGaps[j];
            }
            x += cumulativeColumnGap * backgroundCellSize;
            x += backgroundCellSize * interval.margin;

            interval.setOther(x);
        }

        // Go through bottom segments
        for (let i = this.intervals['bottom'].length - 1; i >= 0; i--) {
            let interval = this.intervals['bottom'][i];

            // Find the y
            // Sum up the cell heights of every row above this segment
            let combinedPreviousCellHeight = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }
            let y = backgroundCellSize * combinedPreviousCellHeight;

            // Sum up all row gaps before this row (exclusive)
            let cumulativeRowGap = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                cumulativeRowGap += rowGaps[j];
            }
            y += cumulativeRowGap * backgroundCellSize;
            y += backgroundCellSize * interval.margin;

            interval.setOther(y);
        }

        // Go through left segments
        for (let i = this.intervals['left'].length - 1; i >= 0; i--) {
            let interval = this.intervals['left'][i];

            // Find the x
            let x = interval.otherCoord * backgroundCellSize * cellWidth;
            // Sum up all column gaps before this column
            let cumulativeColumnGap = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                cumulativeColumnGap += columnGaps[j];
            }
            x += cumulativeColumnGap * backgroundCellSize;
            x -= backgroundCellSize * interval.margin;

            interval.setOther(x);
        }

        // Now that all other coordinates are set, find pixel coordinates of the spans
        for (let side in this.intervals) {
            for (let i = 0; i < this.intervals[side].length; i++) {
                let interval = this.intervals[side][i];

                if (interval.side === 'top') {
                    // Find the left or right interval connecting with the start of this top interval
                    let leftInterval = this.intervals['left'].filter(intv => (intv.otherCoord == interval.start && intv.start == interval.otherCoord));
                    let rightInterval = this.intervals['right'].filter(intv => (intv.otherCoord + 1 == interval.start && intv.end + 1 == interval.otherCoord));

                    // Set the start x coordinate to match the left/right interval that exists
                    let xStart = leftInterval[0] != null ? leftInterval[0].otherPixel : rightInterval[0].otherPixel;

                    // Find the left or right interval connecting with the end of this top interval
                    leftInterval = this.intervals['left'].filter(intv => (intv.otherCoord - 1 == interval.end && intv.end + 1 == interval.otherCoord));
                    rightInterval = this.intervals['right'].filter(intv => (intv.otherCoord == interval.end && intv.start == interval.otherCoord));

                    // Set the end x coordinate to match the left/right interval that exists
                    let xEnd = leftInterval[0] != null ? leftInterval[0].otherPixel : rightInterval[0].otherPixel;

                    // Add a new side with the pixel coordinates of this top interval
                    sides.push(new Side(new Point(xStart, interval.otherPixel), new Point(xEnd, interval.otherPixel)));
                }
                else if (interval.side === 'right') {
                    // Find the top or bottom interval connecting with the start of this right interval
                    let topInterval = this.intervals['top'].filter(intv => (intv.otherCoord == interval.start && intv.end == interval.otherCoord));
                    let bottomInterval = this.intervals['bottom'].filter(intv => (intv.otherCoord + 1 == interval.start && intv.start - 1 == interval.otherCoord));

                    // Set the start y coordinate to match the top/bottom interval that exists
                    let yStart = topInterval[0] != null ? topInterval[0].otherPixel : bottomInterval[0].otherPixel;

                    // Find the top or bottom interval connecting with the end of this right interval
                    topInterval = this.intervals['top'].filter(intv => (intv.otherCoord - 1 == interval.end && intv.start - 1 == interval.otherCoord));
                    bottomInterval = this.intervals['bottom'].filter(intv => (intv.otherCoord == interval.end && intv.end == interval.otherCoord));

                    // Set the end y coordinate to match the top/bottom interval that exists
                    let yEnd = topInterval[0] != null ? topInterval[0].otherPixel : bottomInterval[0].otherPixel;

                    // Add a new side with the pixel coordinates of this right interval
                    sides.push(new Side(new Point(interval.otherPixel, yStart), new Point(interval.otherPixel, yEnd)));
                }
                else if (interval.side === 'bottom') {
                    // Find the left or right interval connecting with the start of this bottom interval
                    let leftInterval = this.intervals['left'].filter(intv => (intv.otherCoord == interval.start && intv.end == interval.otherCoord));
                    let rightInterval = this.intervals['right'].filter(intv => (intv.otherCoord + 1 == interval.start && intv.start - 1 == interval.otherCoord));

                    // Set the end x coordinate to match the left/right interval that exists
                    let xStart = leftInterval[0] != null ? leftInterval[0].otherPixel : rightInterval[0].otherPixel;

                    // Find the left or right interval connecting with the end of this bottom interval
                    leftInterval = this.intervals['left'].filter(intv => (intv.otherCoord - 1 == interval.end && intv.start - 1 == interval.otherCoord));
                    rightInterval = this.intervals['right'].filter(intv => (intv.otherCoord == interval.end && intv.end == interval.otherCoord));

                    // Set the start x coordinate to match the left/right interval that exists
                    let xEnd = leftInterval[0] != null ? leftInterval[0].otherPixel : rightInterval[0].otherPixel;

                    // Add a new side with the pixel coordinates of this bottom interval
                    sides.push(new Side(new Point(xEnd, interval.otherPixel), new Point(xStart, interval.otherPixel)));
                }
                else if (interval.side === 'left') {
                    // Find the top or bottom interval connecting with the start of this left interval
                    let topInterval = this.intervals['top'].filter(intv => (intv.otherCoord == interval.start && intv.start == interval.otherCoord));
                    let bottomInterval = this.intervals['bottom'].filter(intv => (intv.otherCoord + 1 == interval.start && intv.end + 1 == interval.otherCoord));

                    // Set the start y coordinate to match the top/bottom interval that exists
                    let yStart = topInterval[0] != null ? topInterval[0].otherPixel : bottomInterval[0].otherPixel;

                    // Find the top or bottom interval connecting with the end of this left interval
                    topInterval = this.intervals['top'].filter(intv => (intv.otherCoord - 1 == interval.end && intv.end + 1 == interval.otherCoord));
                    bottomInterval = this.intervals['bottom'].filter(intv => (intv.otherCoord == interval.end && intv.start == interval.otherCoord));

                    // Set the end y coordinate to match the top/bottom interval that exists
                    let yEnd = topInterval[0] != null ? topInterval[0].otherPixel : bottomInterval[0].otherPixel;

                    // Add a new side with the pixel coordinates of this left interval
                    sides.push(new Side(new Point(interval.otherPixel, yEnd), new Point(interval.otherPixel, yStart)));
                }
            }
        }

        // Store the pixel coordinates of the polygon
        let orderedPoints = [];

        // Find the top-left corner (minimum y, then minimum x)
        let topLeft = sides.reduce((min, side) => {
            let pt = side.start;
            if (
                pt.y < min.y ||
                (pt.y === min.y && pt.x < min.x)
            ) {
                min = pt;
            }
            return min;
        }, sides[0].start);


        // Start from topLeft, build ordered polygon points clockwise
        orderedPoints.push(topLeft);

        // Find the side that starts at topLeft
        let firstSide = sides.find(side => side.start.x === topLeft.x && side.start.y === topLeft.y);
        let currentPoint = firstSide.end;

        orderedPoints.push(new Point(currentPoint.x, currentPoint.y));

        for (let i = 0; i < sides.length; i++) {
            // Find the side that starts at the current point
            let nextSide = sides.find(
                side =>
                    (side.start.x === currentPoint.x && side.start.y === currentPoint.y)
            );
            currentPoint.x = nextSide ? nextSide.end.x : currentPoint.x;
            currentPoint.y = nextSide ? nextSide.end.y : currentPoint.y;

            orderedPoints.push(new Point(currentPoint.x, currentPoint.y));
            if (currentPoint.x === topLeft.x && currentPoint.y === topLeft.y) break;
        }

        this.pixelCoords = orderedPoints;

        // Get the display versions of all headers
        for (let i = 0; i < this.headers.length; i++) {
            this.displayHeaders.push(preprocessEntityName(this.headers[i], this.pixelCoords[1].x - this.pixelCoords[0].x));
        }
    }

    positionObsolete() {
        // Clear any previously calculated pixel dimensions
        this.pixelCoords = [];

        // Go through top segments
        for (let i = 0; i < this.intervals['top'].length; i++) {
            let interval = this.intervals['top'][i];

            // Find pixel coordinates of start and end without gaps

            let xStart = interval.start * backgroundCellSize * cellWidth;
            // Find the left interval connecting with this top interval and get its margin
            let leftInterval = this.intervals['left'].filter(intv => (intv.otherCoord == interval.start && intv.start == interval.otherCoord));
            if (leftInterval[0] != null) xStart -= backgroundCellSize * leftInterval[0].margin;
            // Find the right interval connecting with this top interval and get its margin
            let rightInterval = this.intervals['right'].filter(intv => (intv.otherCoord == interval.start && intv.end == interval.otherCoord));
            if (rightInterval[0] != null) xStart += backgroundCellSize * rightInterval[0].margin;

            let xEnd = interval.end * backgroundCellSize * cellWidth;
            // Find the right interval connecting with this top interval and get its margin
            rightInterval = this.intervals['right'].filter(intv => (intv.otherCoord == interval.end && intv.start == interval.otherCoord));
            if (rightInterval[0] != null) xEnd += backgroundCellSize * rightInterval[0].margin;
            // Find the left interval connecting with this top interval and get its margin
            leftInterval = this.intervals['left'].filter(intv => (intv.otherCoord == interval.end && intv.end == interval.otherCoord));
            if (leftInterval[0] != null) xEnd -= backgroundCellSize * leftInterval[0].margin;

            // Sum up all column gaps before this column
            let cumulativeColumnGap = 0;
            for (let j = 0; j <= interval.start; j++) {
                cumulativeColumnGap += columnGaps[j];
            }
            xStart += cumulativeColumnGap * backgroundCellSize;

            // Sum up all column gaps within this interval
            for (let j = interval.start + 1; j <= interval.end; j++) {
                cumulativeColumnGap += columnGaps[j];
            }
            xEnd += cumulativeColumnGap * backgroundCellSize;

            // Find the y
            // Sum up the cell heights of every row above this segment
            let combinedPreviousCellHeight = 0;
            for (let j = 0; j < interval.otherCoord; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }
            let y = backgroundCellSize * combinedPreviousCellHeight;

            // Sum up all row gaps before this row (exclusive)
            let cumulativeRowGap = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                cumulativeRowGap += rowGaps[j];
            }
            y += cumulativeRowGap * backgroundCellSize;
            y -= backgroundCellSize * interval.margin;

            this.pixelCoords.push(new Point(xStart, y));
            this.pixelCoords.push(new Point(xEnd, y));
        }

        // Go through right segments
        for (let i = 0; i < this.intervals['right'].length; i++) {
            let interval = this.intervals['right'][i];

            // Find pixel coordinates of start and end without gaps

            // Sum up the cell heights of every row above this segment
            let combinedPreviousCellHeight = 0;
            for (let j = 0; j < interval.start; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }
            let yStart = combinedPreviousCellHeight * backgroundCellSize;

            // Find the top interval connecting with this right interval and get its margin
            let topInterval = this.intervals['top'].filter(intv => (intv.otherCoord == interval.start && intv.end == interval.otherCoord));
            if (topInterval[0] != null) yStart -= backgroundCellSize * topInterval[0].margin;
            // Find the bottom interval connecting with this right interval and get its margin
            let bottomInterval = this.intervals['bottom'].filter(intv => (intv.otherCoord == interval.start && intv.start == interval.otherCoord));
            if (bottomInterval[0] != null) yStart += backgroundCellSize * bottomInterval[0].margin;

            // Sum up all cell heights within this interval
            for (let j = interval.start; j <= interval.end; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }
            let yEnd = combinedPreviousCellHeight * backgroundCellSize;

            // Find the bottom interval connecting with this right interval and get its margin
            bottomInterval = this.intervals['bottom'].filter(intv => (intv.otherCoord == interval.end && intv.end == interval.otherCoord));
            if (bottomInterval[0] != null) yEnd += backgroundCellSize * bottomInterval[0].margin;
            // Find the top interval connecting with this right interval and get its margin
            topInterval = this.intervals['top'].filter(intv => (intv.otherCoord == interval.end && intv.start == interval.otherCoord));
            if (topInterval[0] != null) yEnd -= backgroundCellSize * topInterval[0].margin;

            // Sum up all row gaps before this row (exclusive)
            let cumulativeRowGap = 0;
            for (let j = 0; j <= interval.start; j++) {
                cumulativeRowGap += rowGaps[j];
            }
            yStart += cumulativeRowGap * backgroundCellSize;

            // Sum up all row gaps within this interval
            for (let j = interval.start + 1; j <= interval.end; j++) {
                cumulativeRowGap += rowGaps[j];
            }
            yEnd += cumulativeRowGap * backgroundCellSize;

            // Find the x
            let x = (interval.otherCoord + 1) * backgroundCellSize * cellWidth;

            // Sum up all column gaps before this column
            let cumulativeColumnGap = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                cumulativeColumnGap += columnGaps[j];
            }
            x += cumulativeColumnGap * backgroundCellSize;
            x += backgroundCellSize * interval.margin;

            this.pixelCoords.push(new Point(x, yStart));
            this.pixelCoords.push(new Point(x, yEnd));
        }

        // Go through bottom segments
        for (let i = this.intervals['bottom'].length - 1; i >= 0; i--) {
            let interval = this.intervals['bottom'][i];

            // Find pixel coordinates of start and end without gaps

            let xStart = interval.start * backgroundCellSize * cellWidth;
            // Find the left interval connecting with this bottom interval and get its margin
            let leftInterval = this.intervals['left'].filter(intv => (intv.otherCoord == interval.start && intv.end == interval.otherCoord));
            if (leftInterval[0] != null) xStart -= backgroundCellSize * leftInterval[0].margin;
            // Find the right interval connecting with this bottom interval and get its margin
            let rightInterval = this.intervals['right'].filter(intv => (intv.otherCoord == interval.start && intv.start == interval.otherCoord));
            if (rightInterval[0] != null) xStart += backgroundCellSize * rightInterval[0].margin;

            let xEnd = (interval.end + 1) * backgroundCellSize * cellWidth;
            // Find the right interval connecting with this bottom interval and get its margin
            rightInterval = this.intervals['right'].filter(intv => (intv.otherCoord == interval.end && intv.end == interval.otherCoord));
            if (rightInterval[0] != null) xEnd += backgroundCellSize * rightInterval[0].margin;
            // Find the left interval connecting with this bottom interval and get its margin
            leftInterval = this.intervals['left'].filter(intv => (intv.otherCoord == interval.end && intv.start == interval.otherCoord));
            if (leftInterval[0] != null) xEnd -= backgroundCellSize * leftInterval[0].margin;

            // Sum up all row gaps before this column
            let cumulativeColumnGap = 0;
            for (let j = 0; j <= interval.start; j++) {
                cumulativeColumnGap += columnGaps[j];
            }
            xStart += cumulativeColumnGap * backgroundCellSize;

            // Sum up all column gaps within this interval
            for (let j = interval.start + 1; j <= interval.end; j++) {
                cumulativeColumnGap += columnGaps[j];
            }
            xEnd += cumulativeColumnGap * backgroundCellSize;

            // Find the y

            // Sum up the cell heights of every row above this segment
            let combinedPreviousCellHeight = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }
            let y = backgroundCellSize * combinedPreviousCellHeight;

            // Sum up all row gaps before this row (exclusive)
            let cumulativeRowGap = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                cumulativeRowGap += rowGaps[j];
            }
            y += cumulativeRowGap * backgroundCellSize;
            y += backgroundCellSize * interval.margin;

            this.pixelCoords.push(new Point(xEnd, y));
            this.pixelCoords.push(new Point(xStart, y));
        }

        // Go through left segments
        for (let i = this.intervals['left'].length - 1; i >= 0; i--) {
            let interval = this.intervals['left'][i];

            // Find pixel coordinates of start and end without gaps

            // Sum up the cell heights of every row above this segment
            let combinedPreviousCellHeight = 0;
            for (let j = 0; j < interval.start; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }
            let yStart = combinedPreviousCellHeight * backgroundCellSize;

            // Find the top interval connecting with this left interval and get its margin
            let topInterval = this.intervals['top'].filter(intv => (intv.otherCoord == interval.start && intv.start == interval.otherCoord));
            if (topInterval[0] != null) yStart -= backgroundCellSize * topInterval[0].margin;
            // Find the bottom interval connecting with this left interval and get its margin
            let bottomInterval = this.intervals['bottom'].filter(intv => (intv.otherCoord == interval.start && intv.end == interval.otherCoord));
            if (bottomInterval[0] != null) yStart += backgroundCellSize * bottomInterval[0].margin;

            // Sum up all cell heights within this interval
            for (let j = interval.start; j <= interval.end; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }
            let yEnd = combinedPreviousCellHeight * backgroundCellSize;

            // Find the bottom interval connecting with this left interval and get its margin
            bottomInterval = this.intervals['bottom'].filter(intv => (intv.otherCoord == interval.end && intv.start == interval.otherCoord));
            if (bottomInterval[0] != null) yEnd += backgroundCellSize * bottomInterval[0].margin;
            // Find the top interval connecting with this left interval and get its margin
            topInterval = this.intervals['top'].filter(intv => (intv.otherCoord == interval.end && intv.end == interval.otherCoord));
            if (topInterval[0] != null) yEnd -= backgroundCellSize * topInterval[0].margin;

            // Sum up all row gaps before this row (exclusive)
            let cumulativeRowGap = 0;
            for (let j = 0; j <= interval.start; j++) {
                cumulativeRowGap += rowGaps[j];
            }
            yStart += cumulativeRowGap * backgroundCellSize;

            // Sum up all row gaps within this interval
            for (let j = interval.start + 1; j <= interval.end; j++) {
                cumulativeRowGap += rowGaps[j];
            }
            yEnd += cumulativeRowGap * backgroundCellSize;

            // Find the x
            let x = interval.otherCoord * backgroundCellSize * cellWidth;
            // Sum up all column gaps before this column
            let cumulativeColumnGap = 0;
            for (let j = 0; j <= interval.otherCoord; j++) {
                cumulativeColumnGap += columnGaps[j];
            }
            x += cumulativeColumnGap * backgroundCellSize;
            x -= backgroundCellSize * interval.margin;

            // console.log("Adding left segment at x =", x, "from y =", yStart, "to y =", yEnd);
            this.pixelCoords.push(new Point(x, yEnd));
            this.pixelCoords.push(new Point(x, yStart));
        }
    }

    draw() {
        // Only draw non-singleton or copied entities
        if (this.singleton) return;

        // Add shadow
        let shadowRegion = new Path2D();
        shadowRegion.moveTo(this.pixelCoords[0].x + 5, this.pixelCoords[0].y + 5);
        for (let i = 1; i < this.pixelCoords.length; i++) {
            shadowRegion.lineTo(this.pixelCoords[i].x + 5, this.pixelCoords[i].y + 5);
        }
        shadowRegion.closePath();

        c.fillStyle = rgbToRgba("rgb(50, 50, 50)", "0.5");
        c.fill(shadowRegion);

        // Find the entity's region
        let region = new Path2D();
        region.moveTo(this.pixelCoords[0].x, this.pixelCoords[0].y);
        for (let i = 1; i < this.pixelCoords.length; i++) {
            region.lineTo(this.pixelCoords[i].x, this.pixelCoords[i].y);
        }
        region.closePath();

        // Draw background
        for (let i = 0; i < this.colors.length; i++) {
            // c.fillStyle = rgbToRgba(this.colors[i], '0.15');
            c.fillStyle = this.colors[i];
            c.fill(region);
        }

        // Draw borders
        c.strokeStyle = this.colors[this.statements.length > 1 ? 0 : (this.deleted.includes(true) ? this.deleted.indexOf(true) : 0)];
        c.stroke(region);

    }

    label(headersIncluded) {
        // Only label non-singleton or copied entities
        if (!headersIncluded || this.singleton) return;

        // Track how many headers have been drawn
        let headerIndex = 0;

        // Go through every header
        for (let i = 0; i < this.headers.length; i++) {

            // Only draw headers for non-singleton or copied entities
            if (this.statements.length > 1 || this.deleted[i]) {
                let backgroundColor = this.colors[i];

                // For copied entities draw crosshatched headers
                if (this.deleted[i]) {
                    // Fill space behind entity name
                    c.fillStyle = backgroundColor;
                    c.fillRect(this.pixelCoords[0].x + 1, this.pixelCoords[0].y + 2 * headerIndex * backgroundCellSize + 1, c.measureText(this.displayHeaders[i]).width + 2 * backgroundCellSize, 2 * backgroundCellSize);

                    // Draw crosshatching pattern for the rest of the header
                    c.fillStyle = createCrosshatchPattern(backgroundColor);
                    c.fillRect(this.pixelCoords[0].x + 1, this.pixelCoords[0].y + 2 * headerIndex * backgroundCellSize + 1, this.pixelCoords[1].x - this.pixelCoords[0].x - 2, 2 * backgroundCellSize);

                    // Draw bottom line of header
                    c.fillStyle = backgroundColor;
                    c.fillRect(this.pixelCoords[0].x + 1, this.pixelCoords[0].y + 2 * headerIndex * backgroundCellSize + 2 * backgroundCellSize, this.pixelCoords[1].x - this.pixelCoords[0].x - 2, 2);
                }
                // For non-singleton entities draw normal headers
                else {
                    c.fillStyle = backgroundColor;
                    c.fillRect(this.pixelCoords[0].x + 1, this.pixelCoords[0].y + 2 * headerIndex * backgroundCellSize + 1, this.pixelCoords[1].x - this.pixelCoords[0].x - 2, 2 * backgroundCellSize);
                }

                // Show header name
                c.fillStyle = "#fff";
                c.font = font;
                c.fillText(this.displayHeaders[i], this.pixelCoords[0].x + backgroundCellSize + 1, this.pixelCoords[0].y + 2 * headerIndex * backgroundCellSize + 1.25 * backgroundCellSize + 1);

                // Increase the drawn header counter
                headerIndex++;
            }
        }
    }

    // Change header color on click
    changeColor() {
        if (mouse.x > this.pixelCoords[0].x && mouse.x < this.pixelCoords[1].x) {
            if (this.statements.length > 1) {
                for (let i = 0; i < this.headers.length; i++) {
                    if (mouse.y > this.pixelCoords[0].y + 2 * i * backgroundCellSize + 1 && mouse.y < this.pixelCoords[0].y + 2 * i * backgroundCellSize + 1 + 2 * backgroundCellSize) {
                        this.colors[i] = hexToRgb(currentColor);
                    }
                }
            }
            else {
                let visHeaders = this.headers.filter(h => this.deleted[this.headers.indexOf(h)]);
                for (let i = 0; i < visHeaders.length; i++) {
                    if (mouse.y > this.pixelCoords[0].y + 2 * i * backgroundCellSize + 1 && mouse.y < this.pixelCoords[0].y + 2 * i * backgroundCellSize + 1 + 2 * backgroundCellSize) {
                        this.colors[this.headers.indexOf(visHeaders[i])] = hexToRgb(currentColor);
                    }
                }
            }
        }
    }
}