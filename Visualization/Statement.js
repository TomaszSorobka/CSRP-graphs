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
        this.textLines = splitTextIntoLines(this.text, (cellWidth - 2) * backgroundCellSize);
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
                    let variations = extractEntityNames(e.headers[i]);
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

    position() {
        // Sum up all row gaps before the statement
        let cumulativeRowGap = 0;
        for(let i = 0; i <= this.y; i++) {
            cumulativeRowGap += rowGaps[i];
        }

        // Sum up all column gaps before the statement
        let cumulativeColumnGap = 0;
        for(let i = 0; i <= this.x; i++) {
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
        let xGap = cumulativeColumnGap * backgroundCellSize;
        let yGap = cumulativeRowGap * backgroundCellSize;

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
            nameIndices.push(getIndicesOf(namesAndColors[i][0], this.text, false));
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