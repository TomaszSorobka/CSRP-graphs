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
        this.pixelCoords = [];

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
        // Clear any previously calculated pixel dimensions
        this.pixelCoords = [];

        // Only the ends of rows
        for (let i = 1; i < this.coords.length; i+=2) {
            // Find the x

            // Find pixel x coordinate without gaps
            let x = (this.coords[i].x + 1) * backgroundCellSize * cellWidth + backgroundCellSize * this.marginRight;

            // Sum up all column gaps before this column
            let cumulativeColumnGap = 0;
            for(let j = 0; j <= this.coords[i].x; j++) {
                cumulativeColumnGap += rowGaps[j];
            }

            // Add gaps
            x += cumulativeColumnGap * backgroundCellSize;

            // Find the y

            // Sum up the cell heights of every row above the entity
            let combinedPreviousCellHeight = 0;
            for (let j = 0; j < this.coords[i].y; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }

            // Find pixel upper y coordinate without gaps
            let y = backgroundCellSize * combinedPreviousCellHeight;

            // Sum up all row gaps before this row (exclusive)
            let cumulativeRowGap = 0;
            for(let j = 0; j <= this.coords[i].y; j++) {
                cumulativeRowGap += columnGaps[j];
            }

            let upperY = y + cumulativeRowGap * backgroundCellSize;
            let lowerY = upperY + cellHeights[this.coords[i].y] * backgroundCellSize; // For the lower corner add the cell height of this row

            this.pixelCoords.push(new Point(x, upperY));
            this.pixelCoords.push(new Point(x, lowerY));
        }

        // Only the beginnings of rows
        for (let i = this.coords.length - 2; i >= 0; i-=2) {
            // Find the x

            // Find pixel x coordinate without gaps
            let x = this.coords[i].x * backgroundCellSize * cellWidth - backgroundCellSize * this.marginLeft;

            // Sum up all column gaps before this column
            let cumulativeColumnGap = 0;
            for(let j = 0; j <= this.coords[i].x; j++) {
                cumulativeColumnGap += rowGaps[j];
            }

            // Add gaps
            x += cumulativeColumnGap * backgroundCellSize;

            // Find the y

            // Sum up the cell heights of every row above the entity
            let combinedPreviousCellHeight = 0;
            for (let j = 0; j < this.coords[i].y; j++) {
                combinedPreviousCellHeight += cellHeights[j];
            }

            // Find pixel upper y coordinate without gaps
            let y = backgroundCellSize * combinedPreviousCellHeight;

            // Sum up all row gaps before this row (exclusive)
            let cumulativeRowGap = 0;
            for(let j = 0; j <= this.coords[i].y; j++) {
                cumulativeRowGap += columnGaps[j];
            }

            let upperY = y + cumulativeRowGap * backgroundCellSize;
            let lowerY = upperY + cellHeights[this.coords[i].y] * backgroundCellSize; // For the lower corner add the cell height of this row

            this.pixelCoords.push(new Point(x, lowerY));
            this.pixelCoords.push(new Point(x, upperY));
        }

        // Add the bottom margin to the last row
        this.pixelCoords[this.pixelCoords.length / 2 - 1].y += this.marginBottom * backgroundCellSize;
        this.pixelCoords[this.pixelCoords.length / 2].y += this.marginBottom * backgroundCellSize;

        // Shift top-left corner point from the end to the beginning of the list
        let topLeft = this.pixelCoords.pop();
        this.pixelCoords.unshift(topLeft);

        // Add the top margin to the first row
        this.pixelCoords[0].y -= this.marginTop * backgroundCellSize;
        this.pixelCoords[1].y -= this.marginTop * backgroundCellSize;
    }

    draw() {
        // Only draw non-singleton or copied entities
        if (this.statements.length > 1 || this.deleted.includes(true)) {
            // Find the entity's region
            let region = new Path2D();
            region.moveTo(this.pixelCoords[0].x, this.pixelCoords[0].y);
            for (let i = 1; i < this.pixelCoords.length; i++) {
                region.lineTo(this.pixelCoords[i].x, this.pixelCoords[i].y);
            }
            region.closePath();

            // Draw background
            for (let i = 0; i < this.colors.length; i++) {
                c.fillStyle = rgbToRgba(this.colors[i], '0.15');
                c.fill(region);
            }
    
            // Draw borders
            c.strokeStyle = this.colors[this.statements.length > 1 ? 0 : (this.deleted.includes(true) ? this.deleted.indexOf(true) : 0)];
            c.stroke(region);
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
                    c.fillText(this.displayHeaders[i], this.pixelCoords[0].x + backgroundCellSize + 1, this.pixelCoords[0].y + 2 * headerIndex * backgroundCellSize + 1.25 * backgroundCellSize + 1);

                    // Increase the drawn header counter
                    headerIndex++;
                }
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