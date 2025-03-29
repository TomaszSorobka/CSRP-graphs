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
    
    extractNames(input) {
        const result = [];
      
        // Match: everything before the parentheses
        const mainMatch = input.match(/^(.+?)\s*\(/);
        if (mainMatch) {
          result.push(mainMatch[1].trim());
        }
      
        // Match: everything inside the parentheses
        const parenMatch = input.match(/\(([^)]+)\)/);
        if (parenMatch) {
          const innerNames = parenMatch[1].split(',').map(name => name.trim());
          result.push(...innerNames);
        }
      
        return result;
    }

    getEntityNamesAndColors() {
        let names = [];
        let colors = [];
        let combined = [];

        this.entities.forEach(e => {
            for (let i = 0; i < e.headers.length; i++) {
                if (e.headers[i].indexOf("/") > -1) {
                    let variations = this.splitEntityName(e.headers[i]);
                    names.push(variations[0]);
                    names.push(variations[1]);

                    colors.push(e.colors[i]);
                    colors.push(e.colors[i]);
                }
                else if (e.headers[i].indexOf("(") > -1) {
                    let variations = this.extractNames(e.headers[i]);
                    variations.forEach(n => {
                        names.push(n);
                        colors.push(e.colors[i]);
                    });
                }
                else {
                    names.push(e.headers[i]);
                    colors.push(e.colors[i]);
                }
            }
        });

        for (let i = 0; i < names.length; i++) {
            combined[i] = [names[i], colors[i]];
        }

        combined.sort((a, b) => a[0].length - b[0].length);

        return combined;
    }

    getIndicesOf(searchStr, str, caseSensitive) {
        let searchStrLen = searchStr.length;
        if (searchStrLen == 0) {
            return [];
        }
        let startIndex = 0, index, indices = [];
        if (!caseSensitive) {
            str = str.toLowerCase();
            searchStr = searchStr.toLowerCase();
        }
        while ((index = str.indexOf(searchStr, startIndex)) > -1) {
            indices.push(index);
            startIndex = index + searchStrLen;
        }
        return indices;
    }

    splitEntityName(str) {
        let parts = str.split('/');
        // Ensure there's exactly one '/'
        if (parts.length !== 2) return null;
        
        let before = parts[0].trim();
        let after = parts[1].trim();
        
        let beforeWords = before.split(' ');
        beforeWords.pop();
    
        let modifiedBefore = beforeWords.join(' ');
        let modifiedString = modifiedBefore + ' ' + after;
        
        return [before, modifiedString];
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
        c.fillStyle = "rgba(245, 245, 245, 1)";
        c.fillRect(this.xStart, this.yStart, backgroundCellSize * cellWidth, backgroundCellSize * cellHeights[this.y]);

        // Get entity names, their colors and find their indices in the text
        let namesAndColors = this.getEntityNamesAndColors();
        let nameIndices = [];

        for (let i = 0; i < namesAndColors.length; i++) {
            nameIndices.push(this.getIndicesOf(namesAndColors[i][0], this.text, false));
        }

        let currentIndex = 0;
        let currentNameLength = 0;
        let drawingName = false;
        let lengthSoFar = 0;

        for (let i = 0; i < this.textLines.length; i++) {
            // Draw each character separately
            for (let j = 0; j < this.textLines[i].length; j++) {

                // Check if we are at the start of an entity name
                for (let k = 0; k < nameIndices.length; k++) {
                    for (let l = 0; l < nameIndices[k].length; l++) {
                        // Switch to entity's color
                        if (currentIndex == nameIndices[k][l]) {
                            c.fillStyle = namesAndColors[k][1];
                            currentNameLength = namesAndColors[k][0].length;
                            drawingName = true;
                            break;
                        }
                    }
                }

                // If we are no longer drawing an entity switch back to black
                if (!drawingName) c.fillStyle = "#000";

                // Check if we are drawing the name of a singleton set and update the font
                let drawingBold = false;
                if (c.fillStyle == "#ffffff") {
                    c.fillStyle = "#000";
                    c.font = "bolder 10px sans-serif";
                    drawingBold = true;
                }

                // Draw next character
                c.fillText(this.textLines[i][j], this.xStart + backgroundCellSize + lengthSoFar, this.yStart + (2 + i) * backgroundCellSize);

                // Draw underline
                if (drawingBold) {
                    c.fillRect(this.xStart + backgroundCellSize + lengthSoFar, this.yStart + (2 + i) * backgroundCellSize + 1, c.measureText(this.textLines[i][j]).width + 0.3, 1);
                }

                // Reset font if needed
                if (drawingBold) {
                    c.font = "normal 10px sans-serif";
                    c.fillStyle = "#ffffff";
                }

                // Update pointers
                if (drawingName) currentNameLength--;
                if (currentNameLength == 0) {
                    drawingName = false;
                    drawingBold = false;
                }
                currentIndex++;
                lengthSoFar += c.measureText(this.textLines[i][j]).width;
            }

            // Reset length after each line
            lengthSoFar = 0;
        }
    }
}