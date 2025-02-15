class Entity {
    constructor(id, name, x1, y1, x2, y2, color, statements) {
        this.id = id;
        this.name = name;

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
        for (let i = 0; i < this.colors.length; i++) {
            let r = this.colors[i][0];
            let g = this.colors[i][1];
            let b = this.colors[i][2];

            c.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
            c.fillRect(this.xStart, this.yStart, this.xEnd - this.xStart, this.yEnd - this.yStart);

            c.strokeStyle = `rgba(${r}, ${g}, ${b}, ${100.0 / this.colors.length})`;
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
        for (let i = 0; i < this.headers.length; i++) {
            let r = this.colors[i][0];
            let g = this.colors[i][1];
            let b = this.colors[i][2];

            c.fillStyle = `rgb(${r}, ${g}, ${b})`;
            c.fillRect(this.xStart + 1, this.yStart + 2 * i * backgroundCellSize + 1, this.xEnd - this.xStart - 2, 2 * backgroundCellSize);

            c.fillStyle = "#fff";
            c.fillText(this.headers[i], this.xStart + backgroundCellSize + 1, this.yStart + 2 * i * backgroundCellSize + 1.25 * backgroundCellSize + 1);
        }
    }
}