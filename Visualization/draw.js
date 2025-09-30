// Draw elements on canvas
function drawElements(entityRects, statementCells) {
    // Calculate each entity's position
    for (let i = 0; i < entityRects.length; i++) {
        entityRects[i].position();
    }

    // Order entities by their starting y coordinates
    entityRects.sort((a, b) => a.pixelCoords[0].y - b.pixelCoords[0].y);

    // Draw entities
    for (let i = 0; i < entityRects.length; i++) {
        entityRects[i].draw();
        // entityRects[i].label();
    }

    // Draw statements
    for (let i = 0; i < statementCells.length; i++) {
        statementCells[i].position();
        statementCells[i].draw();
    }
}

// Show background cells
function drawBackgroundGrid() {
    for (var i = backgroundCellSize; i < canvas.width; i += backgroundCellSize) {
        c.strokeStyle = "#dedede";
        c.beginPath();
        c.moveTo(i, 0);
        c.lineTo(i, canvas.height);
        c.stroke();
    }

    for (var i = backgroundCellSize; i < canvas.height; i += backgroundCellSize) {
        c.strokeStyle = "#dedede";
        c.beginPath();
        c.moveTo(0, i);
        c.lineTo(canvas.width, i);
        c.stroke();
    }
}