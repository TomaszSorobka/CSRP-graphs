function roundedPolygonPath(originalPoints, radius, removeLastPoint) {
    let points = originalPoints.slice();
    if (removeLastPoint) points.pop();
    const path = new Path2D();
    const len = points.length;

    if (len < 3) return path;

    let d = "";

    for (let i = 0; i < len; i++) {
        const prev = points[(i - 1 + len) % len];
        const curr = points[i];
        const next = points[(i + 1) % len];

        // Direction vectors
        const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };
        const len1 = Math.hypot(v1.x, v1.y);
        const len2 = Math.hypot(v2.x, v2.y);
        v1.x /= len1; v1.y /= len1;
        v2.x /= len2; v2.y /= len2;

        // Compute interior angle
        const dot = v1.x * v2.x + v1.y * v2.y;
        const angle = Math.acos(Math.min(Math.max(dot, -1), 1));

        // Direction of turn (cross product sign)
        const cross = v1.x * v2.y - v1.y * v2.x;
        const isClockwise = cross < 0;

        // Compute distance from corner to tangent points
        const tanHalf = Math.tan(angle / 2);
        const offset = Math.min(radius / tanHalf, len1 / 2, len2 / 2);

        // Compute start and end tangent points
        const start = {
            x: curr.x - v1.x * offset,
            y: curr.y - v1.y * offset
        };
        const end = {
            x: curr.x + v2.x * offset,
            y: curr.y + v2.y * offset
        };

        if (i === 0) path.moveTo(start.x, start.y);
        else path.lineTo(start.x, start.y);

        // Draw inward arc (reversed direction!)
        path.arcTo(curr.x, curr.y, end.x, end.y, radius);

        if (i === 0) d += `M ${start.x},${start.y}`;
        else d += ` L ${start.x},${start.y}`;

        const sweep = isClockwise ? 0 : 1;
        d += ` A ${radius},${radius} 0 0 ${sweep} ${end.x},${end.y}`;
    }

    path.closePath();
    d += " Z";

    return [path, d];
}