class Entity {
    constructor(x, y, i, width, height, color) {
        this.x = x;
        this.y = y;
        this.i = i;
        this.width = width;
        this.height = height;
        this.color = color;

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
        for(let i = 0; i <= this.x; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        let cumulativeColumnGap = 0;
        for(let i = 0; i <= this.y; i++) {
            cumulativeColumnGap += columnGaps[i];
        }

        let combinedPreviousCellHeight = 0;
        for (let i = 0; i < this.y; i++) {
            combinedPreviousCellHeight += cellHeights[i];
        }

        let xPos = this.x*backgroundCellSize*cellWidth - backgroundCellSize*(this.marginLeft);
        let yPos = backgroundCellSize*combinedPreviousCellHeight - backgroundCellSize*(this.marginTop);
        let xGap = cumulativeRowGap * backgroundCellSize;
        let yGap = cumulativeColumnGap * backgroundCellSize;

        this.xStart = xPos + xGap;
        this.yStart = yPos + yGap;

        cumulativeRowGap = 0;
        for(let i = 0; i <= this.x + this.width; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        cumulativeColumnGap = 0;
        for(let i = 0; i <= this.y + this.height; i++) {
            cumulativeColumnGap += columnGaps[i];
        }

        let combinedCellHeight = 0;
        for (let i = this.y; i <= this.y + this.height; i++) {
            combinedCellHeight += cellHeights[i];
        }

        let xSize = (this.x + this.width + 1) *backgroundCellSize*cellWidth;
        let ySize = backgroundCellSize*(combinedPreviousCellHeight + combinedCellHeight);
        let innerXGap = cumulativeRowGap * backgroundCellSize;
        let innerYGap = cumulativeColumnGap * backgroundCellSize;

        this.xEnd = xSize + innerXGap + backgroundCellSize*(this.marginRight);
        this.yEnd = ySize + innerYGap + backgroundCellSize*(this.marginBottom);
    }

    draw() {
        let r = this.color[0];
        let g = this.color[1];
        let b = this.color[2];

        c.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
        c.fillRect(this.xStart, this.yStart, this.xEnd - this.xStart, this.yEnd - this.yStart);

        c.strokeStyle = `rgb(${r}, ${g}, ${b})`;
        c.beginPath();
        c.moveTo(this.xStart, this.yStart);
        c.lineTo(this.xEnd, this.yStart);
        c.lineTo(this.xEnd, this.yEnd);
        c.lineTo(this.xStart, this.yEnd);
        c.lineTo(this.xStart, this.yStart);
        c.stroke();
    }

    label() {
        let r = this.color[0];
        let g = this.color[1];
        let b = this.color[2];

        c.fillStyle = `rgb(${r}, ${g}, ${b})`;
        c.fillRect(this.xStart, this.yStart, this.xEnd - this.xStart, 2 * backgroundCellSize);

        c.fillStyle = "#fff";
        c.fillText(entities[this.i].name, this.xStart + backgroundCellSize, this.yStart + 1.25 * backgroundCellSize);
    }
}