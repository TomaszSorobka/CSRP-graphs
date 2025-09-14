class Entity {
    constructor(id, name, coords, color, statements) {
        // Identifiers
        this.id = id;
        this.statements = statements;

        // Cell coordinates
        this.coords = coords;

        // Cell dimensions
        this.computeDimensions();

        // Pixel coordinates
        this.xStart;
        this.xEnd;
        this.yStart;
        this.yEnd;

        // Margins
        this.marginLeft = 1;
        this.marginTop = 3;
        this.marginRight = 1;
        this.marginBottom = 1;

        // Header names and their colors
        this.headers = [name];
        this.colors = [color];

        // Visible versions for all headers
        this.displayHeaders = [preprocessEntityName(name, this.width)];

        // Boolean array showing which headers are for copied entities
        this.deleted = [];
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

    position() {
        // Sum up all row gaps before the start of the entity
        let cumulativeRowGap = 0;
        for(let i = 0; i <= this.coords[0].x; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        // Sum up all column gaps before the start of the entity
        let cumulativeColumnGap = 0;
        for(let i = 0; i <= this.coords[0].y; i++) {
            cumulativeColumnGap += columnGaps[i];
        }

        // Sum up the cell heights of every row above the entity
        let combinedPreviousCellHeight = 0;
        for (let i = 0; i < this.coords[0].y; i++) {
            combinedPreviousCellHeight += cellHeights[i];
        }

        // Find pixel coordinates of top-left corner without gaps
        let xPos = this.coords[0].x * backgroundCellSize * cellWidth - backgroundCellSize * this.marginLeft;
        let yPos = backgroundCellSize * combinedPreviousCellHeight - backgroundCellSize * this.marginTop;

        // Find cumulative gaps left of and above entity
        let xGap = cumulativeRowGap * backgroundCellSize;
        let yGap = cumulativeColumnGap * backgroundCellSize;

        // Top-left corner pixel coordinates
        this.xStart = xPos + xGap;
        this.yStart = yPos + yGap;

        // Sum up all row gaps inside the entity
        cumulativeRowGap = 0;
        for(let i = 0; i <= this.coords[0].x + this.width; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        // Sum up all column gaps inside the entity
        cumulativeColumnGap = 0;
        for(let i = 0; i <= this.coords[0].y + this.height; i++) {
            cumulativeColumnGap += columnGaps[i];
        }

        // Sum up the cell heights of every row inside the entity
        let combinedCellHeight = 0;
        for (let i = this.coords[0].y; i <= this.coords[0].y + this.height; i++) {
            combinedCellHeight += cellHeights[i];
        }

        // Find pixel coordinates of bottom-right corner without gaps
        let xSize = (this.coords[0].x + this.width + 1) * backgroundCellSize * cellWidth;
        let ySize = backgroundCellSize * (combinedPreviousCellHeight + combinedCellHeight);

        // Find cumulative gaps inside the entity
        let innerXGap = cumulativeRowGap * backgroundCellSize;
        let innerYGap = cumulativeColumnGap * backgroundCellSize;

        // Bottom-right corner pixel coordinates
        this.xEnd = xSize + innerXGap + backgroundCellSize * this.marginRight;
        this.yEnd = ySize + innerYGap + backgroundCellSize * this.marginBottom;
    }

    draw() {
        // Only draw non-singleton or copied entities
        if (this.statements.length > 1 || this.deleted.includes(true)) {
            // Draw background
            for (let i = 0; i < this.colors.length; i++) {
                c.fillStyle = rgbToRgba(this.colors[i], '0.15');
                c.fillRect(this.xStart, this.yStart, this.xEnd - this.xStart, this.yEnd - this.yStart);
            }
    
            // Draw borders
            c.strokeStyle = this.colors[this.statements.length > 1 ? 0 : (this.deleted.includes(true) ? this.deleted.indexOf(true) : 0)];
            c.beginPath();
            c.moveTo(this.xStart, this.yStart);
            c.lineTo(this.xEnd, this.yStart);
            c.lineTo(this.xEnd, this.yEnd);
            c.lineTo(this.xStart, this.yEnd);
            c.lineTo(this.xStart, this.yStart);
            c.stroke();
        }
    }

    label() {
        // Only label non-singleton or copied entities
        if (this.statements.length > 1 || this.deleted.includes(true)) {

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
                        c.fillRect(this.xStart + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1, c.measureText(this.displayHeaders[i]).width + 2 * backgroundCellSize, 2 * backgroundCellSize);

                        // Draw crosshatching pattern for the rest of the header
                        c.fillStyle = createCrosshatchPattern(backgroundColor);
                        c.fillRect(this.xStart + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1, this.xEnd - this.xStart - 2, 2 * backgroundCellSize);

                        // Draw bottom line of header
                        c.fillStyle = backgroundColor;
                        c.fillRect(this.xStart + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1 + 2 * backgroundCellSize, this.xEnd - this.xStart - 2, 1);
                    }
                    // For non-singleton entities draw normal headers
                    else {
                        c.fillStyle = backgroundColor;
                        c.fillRect(this.xStart + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1, this.xEnd - this.xStart - 2, 2 * backgroundCellSize);
                    }
        
                    // Show header name
                    c.fillStyle = "#fff";
                    c.fillText(this.displayHeaders[i], this.xStart + backgroundCellSize + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1.25 * backgroundCellSize + 1);

                    // Increase the drawn header counter
                    headerIndex++;
                }
            }
        }
    }

    // Change header color on click
    changeColor() {
        if (mouse.x > this.xStart && mouse.x < this.xEnd) {
            if (this.statements.length > 1) {
                for (let i = 0; i < this.headers.length; i++) {
                    if (mouse.y > this.yStart + 2 * i * backgroundCellSize + 1 && mouse.y < this.yStart + 2 * i * backgroundCellSize + 1 + 2 * backgroundCellSize) {
                        this.colors[i] = hexToRgb(currentColor);
                    }
                }
            }
            else {
                let visHeaders = this.headers.filter(h => this.deleted[this.headers.indexOf(h)]);
                for (let i = 0; i < visHeaders.length; i++) {
                    if (mouse.y > this.yStart + 2 * i * backgroundCellSize + 1 && mouse.y < this.yStart + 2 * i * backgroundCellSize + 1 + 2 * backgroundCellSize) {
                        this.colors[this.headers.indexOf(visHeaders[i])] = hexToRgb(currentColor);
                    }
                }
            }
        }
    }
}