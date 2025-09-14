class Entity {
    constructor(id, name, x1, y1, x2, y2, color, statements) {
        // Identifiers
        this.id = id;
        this.statements = statements;

        // Cell coordinates
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;

        // Cell dimensions
        this.width = this.x2 - this.x1;
        this.height = this.y2 - this.y1;

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

    position() {
        // Sum up all row gaps before the start of the entity
        let cumulativeRowGap = 0;
        for(let i = 0; i <= this.x1; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        // Sum up all column gaps before the start of the entity
        let cumulativeColumnGap = 0;
        for(let i = 0; i <= this.y1; i++) {
            cumulativeColumnGap += columnGaps[i];
        }

        // Sum up the cell heights of every row above the entity
        let combinedPreviousCellHeight = 0;
        for (let i = 0; i < this.y1; i++) {
            combinedPreviousCellHeight += cellHeights[i];
        }

        // Find pixel coordinates of top-left corner without gaps
        let xPos = this.x1 * backgroundCellSize * cellWidth - backgroundCellSize * this.marginLeft;
        let yPos = backgroundCellSize * combinedPreviousCellHeight - backgroundCellSize * this.marginTop;

        // Find cumulative gaps left of and above entity
        let xGap = cumulativeRowGap * backgroundCellSize;
        let yGap = cumulativeColumnGap * backgroundCellSize;

        // Top-left corner pixel coordinates
        this.xStart = xPos + xGap;
        this.yStart = yPos + yGap;

        // Sum up all row gaps inside the entity
        cumulativeRowGap = 0;
        for(let i = 0; i <= this.x1 + this.width; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        // Sum up all column gaps inside the entity
        cumulativeColumnGap = 0;
        for(let i = 0; i <= this.y1 + this.height; i++) {
            cumulativeColumnGap += columnGaps[i];
        }

        // Sum up the cell heights of every row inside the entity
        let combinedCellHeight = 0;
        for (let i = this.y1; i <= this.y1 + this.height; i++) {
            combinedCellHeight += cellHeights[i];
        }

        // Find pixel coordinates of bottom-right corner without gaps
        let xSize = (this.x1 + this.width + 1) * backgroundCellSize * cellWidth;
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