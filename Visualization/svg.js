function exportToSVG(VisualizationSettings) {
    // Create svg and set parameters
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    createSVG(svg, svgNS);

    // Draw elements
    drawEntities(svg, svgNS, VisualizationSettings);
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

function createSVG(svg, svgNS) {
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

function drawEntities(svg, svgNS, VisualizationSettings) {
    // Draw entities in order of their starting y coordinates
    if (VisualizationSettings.entityRender == "transparent") entityRects.sort((a, b) => a.pixelCoords[0].y - b.pixelCoords[0].y);

    // Create entity groups
    const entityGroups = new Map();
    entityRects.forEach(entity => {
        const entityGroup = document.createElementNS(svgNS, "g");
        entityGroup.setAttribute("id", `entity-${entity.id}`);
        entityGroup.setAttribute("font-size", `${backgroundCellSize}px`);
        entityGroup.setAttribute("font-family", "Arial");
        entityGroups.set(entity.id, entityGroup);
    });

    // Draw each entity
    entityRects.forEach(entity => {
        drawEntity(entity, entityGroups.get(entity.id), svgNS, VisualizationSettings);
        if (VisualizationSettings.headersIncluded) labelEntity(entity, entityGroups.get(entity.id), svgNS);
        svg.appendChild(entityGroups.get(entity.id));
    });
}

function drawEntity(entity, entityGroup, svgNS, VisualizationSettings) {
    // Only draw non-singleton entities or singleton copies
    if (!entity.singleton) {
        const color = entity.colors[entity.statements.length > 1 ? 0 : (entity.deleted.includes(true) ? entity.deleted.indexOf(true) : 0)];

        // Shadow
        if (VisualizationSettings.enableShadow) {
            const shadowPath = document.createElementNS(svgNS, "path");
            shadowPath.setAttribute("d", entity.svgShadowPath);
            shadowPath.setAttribute("fill", "rgba(50, 50, 50, 0.5)");
            entityGroup.appendChild(shadowPath);
        }

        // Polygon
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", entity.svgPath);
        path.setAttribute("fill", color);

        if (VisualizationSettings.entityRender == "transparent") {
            path.setAttribute("fill-opacity", 0.15);
            path.setAttribute("stroke", color);
        }

        // Dashed outline for repeated entities
        // if (entity.deleted.includes(true)) {
        //     poly.setAttribute("stroke", "#333"); // outline color
        //     poly.setAttribute("stroke-dasharray", "5,5"); // dash pattern: 5px dash, 5px gap
        // }

        // // Draw borders
        // if (VisualizationSettings.enableOutline) {
        //     path.setAttribute("stroke", VisualizationSettings.outlineColor);
        //     path.setAttribute("stroke-width", VisualizationSettings.outlineWeight);
        // }

        // Draw borders
        if (VisualizationSettings.enableOutline) {
            if (!entity.deleted.includes(true) && VisualizationSettings.outlineNonRepeated) {
                path.setAttribute("stroke", VisualizationSettings.outlineColor);
                path.setAttribute("stroke-width", VisualizationSettings.outlineWeight);
            }
            else if (entity.deleted.includes(true) && VisualizationSettings.outlineRepeated) {
                if (VisualizationSettings.dashRepeated) {
                    path.setAttribute("stroke", VisualizationSettings.outlineColor);
                    path.setAttribute("stroke-width", VisualizationSettings.outlineWeight);
                    path.setAttribute("stroke-dasharray", "5,5");
                }
                else {
                    path.setAttribute("stroke", VisualizationSettings.outlineColor);
                    path.setAttribute("stroke-width", VisualizationSettings.outlineWeight);
                }
            }
        }

        entityGroup.appendChild(path);
    }
}

function labelEntity(entity, entityGroup, svgNS) {
    // Only label non-singleton entities or singleton copies
    if (!entity.singleton) {
        const width = entity.pixelCoords[1].x - entity.pixelCoords[0].x;

        // Headers
        let headerIndex = 0;
        for (let i = 0; i < entity.headers.length; i++) {
            if (entity.statements.length > 1 || entity.deleted[i]) {
                const headerHeight = 2 * backgroundCellSize;
                const headerY = entity.pixelCoords[0].y + headerIndex * headerHeight;

                // Background rect
                const headerBackground = document.createElementNS(svgNS, "path");
                headerBackground.setAttribute("d", entity.svgHeaderOutlines[i]);
                headerBackground.setAttribute("fill", entity.colors[i]);

                // Area behind name
                const nameBackground = document.createElementNS(svgNS, "path");
                nameBackground.setAttribute("d", entity.svgNameOutlines[i]);
                nameBackground.setAttribute("fill", entity.colors[i]);

                entityGroup.appendChild(headerBackground);

                // Crosshatch if marked as deleted
                if (entity.deleted[i]) crosshatchHeader(entityGroup, svgNS, entity, i, width, headerY, headerHeight);

                entityGroup.appendChild(nameBackground);

                // Header text
                const text = document.createElementNS(svgNS, "text");
                text.setAttribute("x", entity.pixelCoords[0].x + backgroundCellSize + 1);
                text.setAttribute("y", headerY + 1.25 * backgroundCellSize + 1);
                text.setAttribute("fill", "white");
                text.textContent = entity.displayHeaders[i];
                entityGroup.appendChild(text);

                headerIndex++;
            }
        }
    }
}

function drawStatements(svg, svgNS) {
    // Draw statements
    statementCells.forEach(statement => {
        // Group elements in this statement
        const statementGroup = document.createElementNS(svgNS, "g");
        statementGroup.setAttribute("id", `statement-${statement.id || "group"}`);
        statementGroup.setAttribute("font-size", `${backgroundCellSize}px`);
        statementGroup.setAttribute("font-family", "Arial");

        const xStart = statement.pixelCoords[0].x;
        const yStart = statement.pixelCoords[0].y;

        // Draw background rectangle
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d", statement.svgPath);
        path.setAttribute("fill", "rgb(255, 255, 255)");
        statementGroup.appendChild(path);

        // Get entity names and their positions
        let namesAndColors = statement.getEntityNamesAndColors();
        let nameIndices = [];

        for (let i = 0; i < namesAndColors.length; i++) {
            nameIndices.push(getIndicesOf(namesAndColors[i][0], statement.text, false));
        }

        // Pointers
        let currentIndex = 0;
        let drawingName = false;
        let lengthSoFar = 0;
        let ongoingNameLengthsAndColors = [];

        // Draw each character in statement text
        for (let i = 0; i < statement.textLines.length; i++) {
            for (let j = 0; j < statement.textLines[i].length; j++) {

                // Check if we are at the start of an entity name
                for (let k = 0; k < nameIndices.length; k++) {
                    for (let l = 0; l < nameIndices[k].length; l++) {
                        if (currentIndex == nameIndices[k][l]) {
                            // Add name length and color to list of current names
                            ongoingNameLengthsAndColors.unshift([namesAndColors[k][0].length, namesAndColors[k][1]]);
                        }
                    }
                }

                // Sort names by (remaining) length
                ongoingNameLengthsAndColors.sort((a, b) => a[0] - b[0]);

                // If names start at this index draw the shortest (first) one
                if (ongoingNameLengthsAndColors.length > 0) {
                    fillColor = ongoingNameLengthsAndColors[0][1];
                    drawingName = true;
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
                ongoingNameLengthsAndColors.forEach(e => {
                    e[0]--; // Decrease remaining length of all current names
                    // Remove names from the list when they are done
                    if (e[0] == 0) ongoingNameLengthsAndColors.splice(ongoingNameLengthsAndColors.indexOf(e), 1);
                });

                // No names left to draw at this index
                if (ongoingNameLengthsAndColors.length == 0) {
                    drawingName = false;
                    drawingBold = false;
                }
                else {
                    fillColor = ongoingNameLengthsAndColors[0][1];
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

    // Define what area to clip
    const clipRect = document.createElementNS(svgNS, "rect");
    clipRect.setAttribute("x", entity.pixelCoords[0].x + 5);
    clipRect.setAttribute("y", headerY + 1);
    clipRect.setAttribute("width", width - 7);
    clipRect.setAttribute("height", headerHeight - 1);
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
        line.setAttribute("x1", entity.pixelCoords[0].x + x);
        line.setAttribute("y1", headerY);
        line.setAttribute("x2", entity.pixelCoords[0].x + x + headerHeight);
        line.setAttribute("y2", headerY + headerHeight);
        hatchGroup.appendChild(line);
    }

    // Backslash lines (\)
    for (let x = -headerHeight; x < width + headerHeight; x += spacing) {
        const line = document.createElementNS(svgNS, "line");
        line.setAttribute("x1", entity.pixelCoords[0].x + x + headerHeight);
        line.setAttribute("y1", headerY);
        line.setAttribute("x2", entity.pixelCoords[0].x + x);
        line.setAttribute("y2", headerY + headerHeight);
        hatchGroup.appendChild(line);
    }

    entityGroup.appendChild(hatchGroup);
}