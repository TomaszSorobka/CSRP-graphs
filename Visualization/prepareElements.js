function initializeElements() {
    // Gather all non-singleton entities
    let nonSingletonEntities = [];
    entities.forEach(e => {
        if (e.statements.length > 1) {
            nonSingletonEntities.push(e.id);
        }
    });

    // Assign random colors for all non-singleton entities
    let randomColors = generateDistinctDarkColors(nonSingletonEntities.length);
    let nextColor = 0;

    // Initialize entities
    for (var i = 0; i < entities.length; i++) {
        let id = entities[i].id;
        let name = entities[i].name;
        let x1 = entities[i].x1;
        let y1 = entities[i].y1;
        let x2 = entities[i].x2;
        let y2 = entities[i].y2;
        let statements = entities[i].statements;

        // Non-singleton entities entities get their assigned colors
        if (nonSingletonEntities.indexOf(id) > -1) {
            entityRects[i] = new Entity(id, name, x1, y1, x2, y2, randomColors[nextColor], statements);
            nextColor++;
        }
        // Singleton entities are assigned white
        else {
            entityRects[i] = new Entity(id, name, x1, y1, x2, y2, 'rgb(255, 255, 255)', statements);
        }
    }

    // Initialize statements
    for (var i = 0; i < statements.length; i++) {
        let id = statements[i].id;
        let x = statements[i].x;
        let y = statements[i].y;
        let text = statements[i].text;
        let entities = statements[i].entities;
        statementCells[i] = new Statement(id, x, y, text, entities);
    }
}

function mergeEntitiesWithSameStatements() {
    for (let i = 0; i < entityRects.length; i++) {
        for (let j = i + 1; j < entityRects.length; j++) {
            // Check if a pair of entities have the same statements
            if (entityRects[i].statements.sort().join(',') === entityRects[j].statements.sort().join(',')) {

                // Add second entity's information to first entity
                entityRects[i].headers.push(entityRects[j].name);
                entityRects[i].displayHeaders.push(entityRects[j].displayName);
                entityRects[i].colors.push(entityRects[j].color);

                // Increase first entity's margin to cover the additional header
                entityRects[i].marginTop += 2;
                // Remove second entity's rectangle
                entityRects.splice(j, 1);
            }
        }
    }

    // Add entities to statements' entity lists after merging
    for (let i = 0; i < entityRects.length; i++) {
        for (let j = 0; j < statements.length; j++) {
            if (entityRects[i].statements.includes(statements[j].id)) {
                statements[j].entities.push(entityRects[i]);
            }
        }
    }
}

function markCopiedEntities() {
    // Collect names of copied entities
    let repeated = [];
    for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
            if (entities[i].name == entities[j].name) {
                repeated.push(entities[i].name);
            }
        }
    }

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
                e.colors[i] = deletedColors[repeated.indexOf(e.headers[i])];
            }
        }
    });

    // Set number of visible headers
    entityRects.forEach(e => {
        if (e.statements.length > 1) {
            e.visibleHeaders = e.headers.length;
        }
        else {
            e.visibleHeaders = e.deleted.filter(d => d == true).length;
        }
    });

    // Update top margins based on how many of the entity's headers are visible
    entityRects.forEach(e => {
        e.marginTop = e.visibleHeaders * 2 + 1;
    });
}