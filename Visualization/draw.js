// Draw elements on canvas
function drawElements(entityRects, statementCells) {
    // Calculate each entity's position and draw it accordingly
    for (let i = 0; i < entityRects.length; i++) {
        entityRects[i].position();
        entityRects[i].draw();
    }

    // Draw entity headers
    for (let i = 0; i < entityRects.length; i++) {
        entityRects[i].label();
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