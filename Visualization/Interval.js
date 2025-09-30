class Interval {
    constructor(start, end, other, side, entity) {
        this.start = start; // Start coordinate (x or y depending on side)
        this.end = end;     // End coordinate (x or y depending on side)
        this.otherCoord = other; // The fixed coordinate (y for top/bottom, x for left/right)
        this.side = side; // 'top', 'right', 'bottom', 'left'
        this.margin = 1; // Margin to apply when positioning entities
        this.entity = entity; // Reference to the entity this interval belongs to
    }

    // Check if this interval overlaps with another
    overlaps(other) {
        // Allow left-right and top-bottom overlaps as well as same-side
        const oppositeSides = {
            left: 'right',
            right: 'left',
            top: 'bottom',
            bottom: 'top'
        };

        // Check if sides are the same or opposite
        if (
            this.side !== other.side &&
            oppositeSides[this.side] !== other.side
        ) {
            return false;
        }
        return this.start <= other.end && this.end >= other.start;
    }

    // Get the length of the interval
    length() {
        return this.end - this.start;
    }

    // Set the other coordinate of the interval on the canvas
    setOther(value) {
        this.otherPixel = value;
    }
}