class Statement {
    constructor(id, x, y, text, entities) {
        // Identifiers
        this.id = id;
        this.text = text;
        this.entities = entities;

        // Cell coordinates
        this.x = x;
        this.y = y;

        // Pixel coordinates
        this.xStart;
        this.yStart;
        
        // Lines of text stored as separate strings
        this.textLines = this.preprocessText();
    }

    // Split text into lines to fit into a statement cell
    preprocessText() {
        let lines = [];
        let lineLength = (cellWidth - 2) * backgroundCellSize;

        let words = this.text.split(" ");
        let line = "";

        // Build line word by word
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
    
    // Get all variations from an entity name
    extractNames(input) {
        const result = [];
    
        // Match the name before any ( or [ with a space
        const mainMatch = input.match(/^([^(^\[]+?)(?=\s*(\(|\[|$))/);
        if (mainMatch) {
            result.push(mainMatch[1].trim());
        }
    
        // Match names inside parentheses only if preceded by a space
        const parenMatch = input.match(/(?<=\s)\(([^)]+)\)/);
        if (parenMatch) {
            result.push(...parenMatch[1].split(',').map(s => s.trim()));
        }
    
        // Match names inside square brackets only if preceded by a space
        const bracketMatch = input.match(/(?<=\s)\[([^\]]+)\]/);
        if (bracketMatch) {
            result.push(...bracketMatch[1].split(',').map(s => s.trim()));
        }
    
        return result;
    }
    
    // Get all entity names appearing in the statement text and their corresponding colors
    getEntityNamesAndColors() {
        let names = [];
        let colors = [];
        let combined = [];

        // Check the headers of all entities appearing in the statement
        this.entities.forEach(e => {
            for (let i = 0; i < e.headers.length; i++) {
                // Find variations of necessary
                if (e.headers[i].indexOf("(") > -1 || e.headers[i].indexOf("[") > -1) {
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

        // Combine names and colors into a single array
        for (let i = 0; i < names.length; i++) {
            combined[i] = [names[i], colors[i]];
        }

        // Sort by name length in increasing order
        combined.sort((a, b) => a[0].length - b[0].length);

        return combined;
    }

    // Find all indices of a name in the text
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

    position() {
        // Sum up all row gaps before the statement
        let cumulativeRowGap = 0;
        for(let i = 0; i <= this.x; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        // Sum up all column gaps before the statement
        let cumulativeColumnGap = 0;
        for(let i = 0; i <= this.y; i++) {
            cumulativeColumnGap += columnGaps[i];
        }
        // Sum up the cell heights of every row above the statement
        let combinedPreviousCellHeight = 0;
        for (let i = 0; i < this.y; i++) {
            combinedPreviousCellHeight += cellHeights[i];
        }

        // Find pixel coordinates of top-left corner without gaps
        let xPos = this.x * backgroundCellSize * cellWidth;
        let yPos = backgroundCellSize * combinedPreviousCellHeight;

        // Find cumulative gaps left of and above statement
        let xGap = cumulativeRowGap * backgroundCellSize;
        let yGap = cumulativeColumnGap * backgroundCellSize;

        // Top-left corner pixel coordinates
        this.xStart = xPos + xGap;
        this.yStart = yPos + yGap;
    }

    draw() {
        // Draw background
        c.fillStyle = "rgb(255, 255, 255)";
        c.fillRect(this.xStart, this.yStart, backgroundCellSize * cellWidth, backgroundCellSize * cellHeights[this.y]);

        // Get entity names and their colors
        let namesAndColors = this.getEntityNamesAndColors();

        // Find name indices in the text
        let nameIndices = [];
        for (let i = 0; i < namesAndColors.length; i++) {
            nameIndices.push(this.getIndicesOf(namesAndColors[i][0], this.text, false));
        }

        // Pointers
        let currentIndex = 0;
        let currentNameLength = 0;
        let drawingName = false;
        let lengthSoFar = 0;

        let cachedLength = 0;
        let cachedColor = null;

        // Draw each character in statement text
        for (let i = 0; i < this.textLines.length; i++) {
            for (let j = 0; j < this.textLines[i].length; j++) {

                // Check if we are at the start of an entity name
                for (let k = 0; k < nameIndices.length; k++) {
                    for (let l = 0; l < nameIndices[k].length; l++) {
                        // Switch to entity's color
                        if (currentIndex == nameIndices[k][l]) {
                            // If we haven't finished drawing a previous name, store info so it can be finished later
                            if (currentNameLength > 0) {
                                cachedLength = currentNameLength;
                                cachedColor = c.fillStyle;
                            }

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
                if (drawingName && cachedLength > 0) cachedLength--;
                if (currentNameLength == 0) {
                    if (cachedLength == 0) {
                        drawingName = false;
                        drawingBold = false;
                    }
                    else {
                        currentNameLength = cachedLength;
                        cachedLength = 0;
                        c.fillStyle = cachedColor;
                    }
                }

                // Move on to next character
                currentIndex++;
                lengthSoFar += c.measureText(this.textLines[i][j]).width;
            }

            // Reset length after each line
            lengthSoFar = 0;
        }
    }
}