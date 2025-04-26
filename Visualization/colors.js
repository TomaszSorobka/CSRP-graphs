function generateDistinctDarkColors(n) {
    let colors = [];
    
    for (let i = 0; i < n; i++) {
        colors.push(`rgb(${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)}, ${Math.floor(Math.random() * 200)})`);
    }

    return colors;
}

function rgbToRgba(rgb, alpha) {
    const match = rgb.match(/^rgb\s*\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/i);
    if (match) {
        const [_, r, g, b] = match;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return rgb; // Fallback if input isn't valid
}

function createCrosshatchPattern(color) {
    const patternCanvas = document.createElement('canvas');
    const size = backgroundCellSize; // Size of one tile
    patternCanvas.width = size;
    patternCanvas.height = size;

    const pc = patternCanvas.getContext('2d');
    pc.strokeStyle = color; // Hatch line color
    pc.lineWidth = 1;

    // Draw crosshatch
    pc.beginPath();
    pc.moveTo(0, 0);
    pc.lineTo(size, size);
    pc.moveTo(size, 0);
    pc.lineTo(0, size);
    pc.stroke();

    return c.createPattern(patternCanvas, 'repeat');
}