function initializeElements(colorPalette, entities, statements, entityRects, statementCells, headersIncluded) {
    // Gather all non-singleton entities
    let nonSingletonEntities = [];
    entities.forEach(e => {
        if (e.statements.length > 1) {
            nonSingletonEntities.push(e);
        }
    });
    
    // Get a ready palette for non-singleton entities
    // let palette = getReadyPalette(colorPalette, nonSingletonEntities.length, false);

    // Build the overlap graph for entities that do not repeat and are not singleton
    nonSingletonEntities = nonSingletonEntities.filter(c => !getCopiedEntities(nonSingletonEntities).includes(c.name))
    let graph = buildOverlapGraph(nonSingletonEntities);

    // Reassign colors so that overlapping entities have distinct colors
    let assignedColors = assignColorsWithOverlap(graph, colorPalette);

    // Keep track of the next color to be assigned to an entity
    let nextColor = 0;

    // Initialize entity rectangles
    for (var i = 0; i < entities.length; i++) {
        let id = entities[i].id;
        let name = entities[i].name;
        let coords = entities[i].coords;
        let statements = entities[i].statements;

        // Non-singleton entities get their assigned colors
        if (nonSingletonEntities.indexOf(entities[i]) > -1) {
            entityRects[i] = new Entity(id, name, coords, assignedColors[nextColor], statements, headersIncluded);
            nextColor++;
        }
        // Singleton entities are assigned white
        else {
            entityRects[i] = new Entity(id, name, coords, 'rgb(255, 255, 255)', statements, headersIncluded);
        }
    }
    // Sort entity rectangles by size
    // entityRects.sort((a, b) => ((a.width * a.height) - (b.width * b.height)));

    // Initialize statement cells
    for (var i = 0; i < statements.length; i++) {
        let id = statements[i].id;
        let x = statements[i].x;
        let y = statements[i].y;
        let text = statements[i].text;
        let entities = statements[i].entities;
        statementCells[i] = new Statement(id, x, y, text, entities);
    }
}

function mergeEntityRectsWithSameStatements(entityRects, headersIncluded) {
    for (let i = 0; i < entityRects.length; i++) {
        for (let j = entityRects.length - 1; j >= i + 1; j--) {
            // Check if a pair of entities have the same statements
            if (entityRects[i].statements.sort().join(',') === entityRects[j].statements.sort().join(',')) {

                // Add second entity's information to first entity
                entityRects[i].headers = entityRects[i].headers.concat(entityRects[j].headers);
                entityRects[i].colors = entityRects[i].colors.concat(entityRects[j].colors);

                // Find the top-left segment of the first entity
                let topLeft = entityRects[i].intervals['top'].filter(interval => interval.isTopLeft)[0];
                // Increase first entity's margin to cover the additional header
                if (headersIncluded) topLeft.margin += 2;
                // Remove second entity's rectangle
                entityRects.splice(j, 1);
            }
        }
    }
}

// Add entity rectangles to statements' entity lists
function mapEntityRectsToStatements(entityRects, statements) {
    for (let i = 0; i < entityRects.length; i++) {
        for (let j = 0; j < statements.length; j++) {
            if (entityRects[i].statements.includes(statements[j].id)) {
                statements[j].entities.push(entityRects[i]);
            }
        }
    }
}

// Find the names of all entities that have multiple copies
function getCopiedEntities(entities) {
    let repeated = [];
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            if (entities[i].name == entities[j].name && !repeated.includes(entities[i].name)) {
                repeated.push(entities[i].name);
            }
        }
    }

    return repeated;
}

function processEntityRectHeaders(entityRects, repeated, headersIncluded) {
    // Mark headers as copied or not
    entityRects.forEach(e => {
        e.headers.forEach(h => {
            e.deleted.push(repeated.includes(h));
        });
    });

    // Set copied header colors
    entityRects.forEach(e => {
        for (let i = 0; i < e.headers.length; i++) {
            if (repeated.includes(e.headers[i])) {
                e.colors[i] = copiedEntityColors[repeated.indexOf(e.headers[i])];
            }
        }
    });

    // Set number of visible headers
    entityRects.forEach(e => {
        // For non-singleton entities draw all headers
        if (e.statements.length > 1) {
            e.visibleHeaders = e.headers.length;
        }
        // For singletons draw only headers of copied entities
        else {
            e.visibleHeaders = e.deleted.filter(d => d == true).length;
        }
    });

    // Update top margins based on how many of the entity's headers are visible
    if (headersIncluded) {
        entityRects.forEach(e => {
            // Find the top-left segment of the entity
            let topLeft = e.intervals['top'].filter(interval => interval.isTopLeft)[0];
            // Update its margin
            topLeft.margin = e.visibleHeaders * 2 + 1;
        });
    }

    // Mark entities as singleton if they have at most one statement and are not copies
    entityRects.forEach(e => {
        if (!e.deleted.includes(true) && e.statements.length <= 1) {
            e.singleton = true;
        }
    });
}