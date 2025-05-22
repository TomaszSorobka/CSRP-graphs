function exportToSVG() {
    // Create svg and set parameters
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    setup(svg, svgNS);

    // Draw elements
    drawEntities(svg, svgNS);
    drawStatements(svg, svgNS);

    // Serialize and download
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "solution.svg";
    link.click();
}

function setup(svg, svgNS) {
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", canvas.width);
    svg.setAttribute("height", canvas.height);

    // Add white background
    const background = document.createElementNS(svgNS, "rect");
    background.setAttribute("x", 0);
    background.setAttribute("y", 0);
    background.setAttribute("width", canvas.width);
    background.setAttribute("height", canvas.height);
    background.setAttribute("fill", "white");
    svg.appendChild(background);
}

function drawEntities(svg, svgNS) {
    // Draw entities in order of their starting y coordinates
    entityRects.sort((a, b) => a.yStart - b.yStart);

    // Create entity groups
    const entityGroups = new Map();
    entityRects.forEach(entity => {
        const entityGroup = document.createElementNS(svgNS, "g");
        entityGroup.setAttribute("id", `entity-${entity.id}`);
        entityGroup.setAttribute("font-size", "10px");
        entityGroup.setAttribute("font-family", "Arial");
        entityGroups.set(entity.id, entityGroup);
    });

    // Draw each entity
    entityRects.forEach(entity => {
        drawEntityRectangle(entity, entityGroups.get(entity.id), svgNS);
        labelEntity(entity, entityGroups.get(entity.id), svg, svgNS);
    });
}

function drawEntityRectangle(entity, entityGroup, svgNS) {
    // Only draw non-singleton entities or singleton copies
    if (entity.statements.length > 1 || entity.deleted.includes(true)) {
        const width = entity.xEnd - entity.xStart;
        const height = entity.yEnd - entity.yStart;
        const color = entity.colors[entity.statements.length > 1 ? 0 : (entity.deleted.includes(true) ? entity.deleted.indexOf(true) : 0)];

        // Translucent background fill
        const fillRect = document.createElementNS(svgNS, "rect");
        fillRect.setAttribute("x", entity.xStart);
        fillRect.setAttribute("y", entity.yStart);
        fillRect.setAttribute("width", width);
        fillRect.setAttribute("height", height);
        fillRect.setAttribute("fill", color);
        fillRect.setAttribute("fill-opacity", 0.15);
        entityGroup.appendChild(fillRect);

        // Border
        const border = document.createElementNS(svgNS, "rect");
        border.setAttribute("x", entity.xStart);
        border.setAttribute("y", entity.yStart);
        border.setAttribute("width", width);
        border.setAttribute("height", height);
        border.setAttribute("fill", "none");
        border.setAttribute("stroke", color);
        entityGroup.appendChild(border);
    }
}

function labelEntity(entity, entityGroup, svg, svgNS) {
    // Only label non-singleton entities or singleton copies
    if (entity.statements.length > 1 || entity.deleted.includes(true)) {
        const width = entity.xEnd - entity.xStart;

        // Headers
        let headerIndex = 0;
        for (let i = 0; i < entity.headers.length; i++) {
            if (entity.statements.length > 1 || entity.deleted[i]) {
                const headerY = entity.yStart + 2 * headerIndex * backgroundCellSize;
                const headerHeight = 2 * backgroundCellSize;

                // Background rect
                const headerBg = document.createElementNS(svgNS, "rect");
                headerBg.setAttribute("x", entity.xStart);
                headerBg.setAttribute("y", headerY);
                headerBg.setAttribute("width", width);
                headerBg.setAttribute("height", headerHeight);
                headerBg.setAttribute("fill", entity.colors[i]);
                entityGroup.appendChild(headerBg);

                // Crosshatch if marked as deleted
                if (entity.deleted[i]) crosshatchHeader(entityGroup, svgNS, entity, i, width, headerY, headerHeight);

                // Header text
                const text = document.createElementNS(svgNS, "text");
                text.setAttribute("x", entity.xStart + backgroundCellSize + 1);
                text.setAttribute("y", headerY + 1.25 * backgroundCellSize + 1);
                text.setAttribute("fill", "white");
                text.textContent = entity.displayHeaders[i];
                entityGroup.appendChild(text);

                headerIndex++;
            }
        }
    }

    svg.appendChild(entityGroup);
}

function drawStatements(svg, svgNS) {
    // Draw statements
    statementCells.forEach(statement => {
        // Group elements in this statement
        const statementGroup = document.createElementNS(svgNS, "g");
        statementGroup.setAttribute("id", `statement-${statement.id || "group"}`);
        statementGroup.setAttribute("font-size", "10px");
        statementGroup.setAttribute("font-family", "Arial");

        const xStart = statement.xStart;
        const yStart = statement.yStart;

        // Draw background rectangle
        const bgRect = document.createElementNS(svgNS, "rect");
        bgRect.setAttribute("x", xStart);
        bgRect.setAttribute("y", yStart);
        bgRect.setAttribute("width", backgroundCellSize * cellWidth);
        bgRect.setAttribute("height", backgroundCellSize * cellHeights[statement.y]);
        bgRect.setAttribute("fill", "rgb(255, 255, 255)");
        statementGroup.appendChild(bgRect);

        // Get entity names and their positions
        let namesAndColors = statement.getEntityNamesAndColors();
        let nameIndices = [];

        for (let i = 0; i < namesAndColors.length; i++) {
            nameIndices.push(statement.getIndicesOf(namesAndColors[i][0], statement.text, false));
        }

        // Pointers
        let currentIndex = 0;
        let currentNameLength = 0;
        let drawingName = false;
        let lengthSoFar = 0;

        let cachedLength = 0;
        let cachedColor = null;

        // Draw each character in statement text
        for (let i = 0; i < statement.textLines.length; i++) {
            for (let j = 0; j < statement.textLines[i].length; j++) {

                // Check if we are at the start of an entity name
                for (let k = 0; k < nameIndices.length; k++) {
                    for (let l = 0; l < nameIndices[k].length; l++) {
                        if (currentIndex == nameIndices[k][l]) {

                            // If we haven't finished drawing a previous name, store info so it could be finished later
                            if (currentNameLength > 0) {
                                cachedLength = currentNameLength;
                                cachedColor = fillColor;
                            }

                            fillColor = namesAndColors[k][1];
                            currentNameLength = namesAndColors[k][0].length;
                            drawingName = true;
                            break;
                        }
                    }
                }

                // If we are not drawing a name, use black
                if (!drawingName) fillColor = "#000";

                // If singleton (white), override to black and bold
                let drawingBold = false;
                let fontWeight = "normal";
                if (fillColor == "rgb(255, 255, 255)") {
                    fillColor = "#000";
                    fontWeight = "bolder";
                    drawingBold = true;
                } else if (fillColor !== "#000") {
                    fontWeight = "bold";
                }

                // Draw character as text
                const textElem = document.createElementNS(svgNS, "text");
                textElem.setAttribute("x", xStart + backgroundCellSize + lengthSoFar);
                textElem.setAttribute("y", yStart + (2 + i) * backgroundCellSize);
                textElem.setAttribute("font-weight", fontWeight);
                textElem.setAttribute("fill", fillColor);
                textElem.textContent = statement.textLines[i][j];
                statementGroup.appendChild(textElem);

                // Draw underline
                if (drawingBold && statement.textLines[i][j] !== " ") {
                    const underline = document.createElementNS(svgNS, "line");
                    const width = c.measureText(statement.textLines[i][j]).width + 0.3;
                    underline.setAttribute("x1", xStart + backgroundCellSize + lengthSoFar);
                    underline.setAttribute("x2", xStart + backgroundCellSize + lengthSoFar + width);
                    underline.setAttribute("y1", yStart + (2 + i) * backgroundCellSize + 1);
                    underline.setAttribute("y2", yStart + (2 + i) * backgroundCellSize + 1);
                    underline.setAttribute("stroke", "#000");
                    underline.setAttribute("stroke-width", "1");
                    statementGroup.appendChild(underline);
                }

                // Reset font if needed
                if (drawingBold) {
                    fillColor = "rgb(255, 255, 255)";
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
                        fillColor = cachedColor;
                    }
                }

                // Move on to next character
                currentIndex++;
                lengthSoFar += c.measureText(statement.textLines[i][j]).width;
            }

            // Reset length after each line
            lengthSoFar = 0;
        }

        svg.appendChild(statementGroup);
    });
}

function crosshatchHeader(entityGroup, svgNS, entity, i, width, headerY, headerHeight) {
    const clipId = `clip-${entity.id}-${i}`;

    // Define a clipping path to restrict hatching to header area
    const clipPath = document.createElementNS(svgNS, "clipPath");
    clipPath.setAttribute("id", clipId);

    const clipRect = document.createElementNS(svgNS, "rect");
    clipRect.setAttribute("x", entity.xStart + 3);
    clipRect.setAttribute("y", headerY + 1);
    clipRect.setAttribute("width", width - 4);
    clipRect.setAttribute("height", headerHeight - 2);
    clipPath.appendChild(clipRect);
    entityGroup.appendChild(clipPath);

    // Create the group for hatch lines
    const hatchGroup = document.createElementNS(svgNS, "g");
    hatchGroup.setAttribute("clip-path", `url(#${clipId})`);
    hatchGroup.setAttribute("stroke", "white");
    hatchGroup.setAttribute("stroke-width", "0.75");

    const spacing = 5;

    // Forward-slash lines (/)
    for (let x = -headerHeight; x < width + headerHeight; x += spacing) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", entity.xStart + x);
        line.setAttribute("y1", headerY);
        line.setAttribute("x2", entity.xStart + x + headerHeight);
        line.setAttribute("y2", headerY + headerHeight);
        hatchGroup.appendChild(line);
    }

    // Backslash lines (\)
    for (let x = -headerHeight; x < width + headerHeight; x += spacing) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", entity.xStart + x + headerHeight);
        line.setAttribute("y1", headerY);
        line.setAttribute("x2", entity.xStart + x);
        line.setAttribute("y2", headerY + headerHeight);
        hatchGroup.appendChild(line);
    }

    entityGroup.appendChild(hatchGroup);

    // Bottom line
    const bottomLine = document.createElementNS(svgNS, "rect");
    bottomLine.setAttribute("x", entity.xStart);
    bottomLine.setAttribute("y", headerY + 2 * backgroundCellSize);
    bottomLine.setAttribute("width", width);
    bottomLine.setAttribute("height", 1);
    bottomLine.setAttribute("fill", entity.colors[i]);
    entityGroup.appendChild(bottomLine);

    // Solid rect behind entity name
    const textWidth = c.measureText(entity.displayHeaders[i]).width;
    const solidBg = document.createElementNS(svgNS, "rect");
    solidBg.setAttribute("x", entity.xStart);
    solidBg.setAttribute("y", headerY);
    solidBg.setAttribute("width", textWidth + 2 * backgroundCellSize);
    solidBg.setAttribute("height", headerHeight);
    solidBg.setAttribute("fill", entity.colors[i]);
    entityGroup.appendChild(solidBg);
}