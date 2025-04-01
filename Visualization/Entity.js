class Entity {
    constructor(id, name, x1, y1, x2, y2, color, statements) {
        this.id = id;
        this.name = name;
        this.displayName = this.removeSquareBracketsAndContent(name);

        // Cell coordinates
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;

        this.width = this.x2 - this.x1;
        this.height = this.y2 - this.y1;
        this.color = color;
        this.colors = [this.color];

        this.statements = statements;
        this.headers = [this.name];
        this.displayHeaders = [this.displayName];
        this.deleted = [];
        this.visibleHeaders;

        // Pixel coordinates
        this.xStart;
        this.xEnd;
        this.yStart;
        this.yEnd;

        this.marginLeft = 1;
        this.marginTop = 3;
        this.marginRight = 1;
        this.marginBottom = 1;
    }

    removeSquareBracketsAndContent(input) {
        return input.replace(/\s*\[[^\]]*\]/g, '');
    }

    position() {
        let cumulativeRowGap = 0;
        for(let i = 0; i <= this.x1; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        let cumulativeColumnGap = 0;
        for(let i = 0; i <= this.y1; i++) {
            cumulativeColumnGap += columnGaps[i];
        }

        let combinedPreviousCellHeight = 0;
        for (let i = 0; i < this.y1; i++) {
            combinedPreviousCellHeight += cellHeights[i];
        }

        let xPos = this.x1 * backgroundCellSize * cellWidth - backgroundCellSize * this.marginLeft;
        let yPos = backgroundCellSize * combinedPreviousCellHeight - backgroundCellSize * this.marginTop;
        let xGap = cumulativeRowGap * backgroundCellSize;
        let yGap = cumulativeColumnGap * backgroundCellSize;

        this.xStart = xPos + xGap;
        this.yStart = yPos + yGap;

        cumulativeRowGap = 0;
        for(let i = 0; i <= this.x1 + this.width; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        cumulativeColumnGap = 0;
        for(let i = 0; i <= this.y1 + this.height; i++) {
            cumulativeColumnGap += columnGaps[i];
        }

        let combinedCellHeight = 0;
        for (let i = this.y1; i <= this.y1 + this.height; i++) {
            combinedCellHeight += cellHeights[i];
        }

        let xSize = (this.x1 + this.width + 1) * backgroundCellSize * cellWidth;
        let ySize = backgroundCellSize * (combinedPreviousCellHeight + combinedCellHeight);
        let innerXGap = cumulativeRowGap * backgroundCellSize;
        let innerYGap = cumulativeColumnGap * backgroundCellSize;

        this.xEnd = xSize + innerXGap + backgroundCellSize * this.marginRight;
        this.yEnd = ySize + innerYGap + backgroundCellSize * this.marginBottom;
    }

    draw() {
        if (this.statements.length > 1 || this.deleted.includes(true)) {
            for (let i = 0; i < this.colors.length; i++) {
                c.fillStyle = rgbToRgba(this.colors[i], '0.15');
                c.fillRect(this.xStart, this.yStart, this.xEnd - this.xStart, this.yEnd - this.yStart);
            }
    
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
        if (this.statements.length > 1 || this.deleted.includes(true)) {
            let headerIndex = 0;
            for (let i = 0; i < this.headers.length; i++) {
                if (this.statements.length > 1 || this.deleted[i]) {
                    let backgroundColor = this.colors[i];

                    if (this.deleted[i]) {
                        // Fill space behind entity name
                        c.fillStyle = backgroundColor;
                        c.fillRect(this.xStart + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1, c.measureText(this.headers[i]).width + 2 * backgroundCellSize, 2 * backgroundCellSize);

                        // Draw crosshatching pattern for the rest of the header
                        c.fillStyle = createCrosshatchPattern(backgroundColor);
                        c.fillRect(this.xStart + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1, this.xEnd - this.xStart - 2, 2 * backgroundCellSize);

                        // Draw bottom line of header
                        c.fillStyle = backgroundColor;
                        c.fillRect(this.xStart + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1 + 2 * backgroundCellSize, this.xEnd - this.xStart - 2, 1);
                    }
                    else {
                        c.fillStyle = backgroundColor;
                        c.fillRect(this.xStart + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1, this.xEnd - this.xStart - 2, 2 * backgroundCellSize);
                    }
        
                    c.fillStyle = "#fff";
                    c.fillText(this.displayHeaders[i], this.xStart + backgroundCellSize + 1, this.yStart + 2 * headerIndex * backgroundCellSize + 1.25 * backgroundCellSize + 1);

                    headerIndex++;
                }
            }
        }
    }

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