package model;

import java.awt.Point;
import java.util.ArrayList;

public class PolygonSolution implements Solution {
    public StatementEntityInstance instance;
    public int w;
    public int h;
    ArrayList<Integer> entityIds;
    public int[][][] entities;
    public int[][] statementCoordinates;
    public ArrayList<Point> cells;

    public PolygonSolution(StatementEntityInstance inst, int w, int h, ArrayList<Integer> eIds, int[][][] entities,
            int[][] sCoords) {
        this.instance = inst;
        this.w = w;
        this.h = h;
        this.entityIds = eIds;
        this.entities = entities;
        this.statementCoordinates = sCoords;
        this.cells = setCells();
    }
    
    @Override
    public StatementEntityInstance getInstance() {
        return this.instance;
    }

    @Override
    public int getW() {
        return this.w;
    }

    @Override
    public int getH() {
        return this.h;
    }

    @Override
    public ArrayList<Integer> getEntityIds() {
        return this.entityIds;
    }

    @Override
    public ArrayList<Point> getCells() {
        return this.cells;
    }

    @Override
    public ArrayList<Point> setCells() {
        ArrayList<Point> coveredCells = new ArrayList<>();

        for (int i = 0; i <= w; i++) {
            for (int j = 0; j <= h; j++) {
                if (entityCovers(i, j)) {
                    coveredCells.add(new Point(i, j));
                }
            }
        }

        return coveredCells;
    }

    private boolean entityCovers(int x, int y) {
        for (int i = 0; i < entities.length; i++) {
            if (entities[i][y][0] == 1) {
                if (entities[i][y][1] <= x && entities[i][y][2] >= x) {
                    return true;
                }
            }
        }

        return false;
    }
}
