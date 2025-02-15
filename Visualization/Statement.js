class Statement {
    constructor(id, x, y, i, text, entities) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.i = i;
        this.xStart;
        this.yStart;
        this.text = text;
        this.textLines = this.preprocessText();
        this.entities = entities;
    }

    preprocessText() {
        let lines = [];
        let lineLength = (cellWidth - 2) * backgroundCellSize;

        let words = this.text.split(" ");
        let line = "";

        for (let word of words) {
            let testLine = line + word;
            let metrics = c.measureText(testLine);
            
            if (metrics.width >= lineLength && line !== "") {
                lines.push(line);
                line = word + " ";
            } else {
                line = testLine + " ";
            }
        }

        lines.push(line);
        
        // Remove leading spaces
        for (let i = 0; i < lines.length; i++) {
            if (lines[i][0] == " ") lines[i] = lines[i].slice(1);
        }

        return lines;
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

        let cellXPos = this.x * backgroundCellSize * cellWidth;
        let cellYPos = backgroundCellSize * combinedPreviousCellHeight;
        let cellXGap = cumulativeRowGap * backgroundCellSize;
        let cellYGap = cumulativeColumnGap * backgroundCellSize;

        this.xStart = cellXPos + cellXGap;
        this.yStart = cellYPos + cellYGap;
    }

    draw() {
        c.fillStyle = "rgba(255, 255, 255, 0.7)";
        c.fillRect(this.xStart, this.yStart, backgroundCellSize * cellWidth, backgroundCellSize * cellHeights[this.y]);

        c.fillStyle = "#000";
        for (let i = 0; i < this.textLines.length; i++) {
            c.fillText(this.textLines[i], this.xStart + backgroundCellSize, this.yStart + (2 + i) * backgroundCellSize);
        }
    }
}