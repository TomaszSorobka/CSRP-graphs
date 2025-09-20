package model;

import java.awt.Point;
import java.util.ArrayList;

public class RectangleSolution implements Solution {
    public StatementEntityInstance instance;
    public int w;
    public int h;
    ArrayList<Integer> entityIds;
    public int[][] entityCoordinates;
    public int[][] statementCoordinates;
    public ArrayList<Point> cells;

    public RectangleSolution(StatementEntityInstance inst, int w, int h, ArrayList<Integer> eIds, int[][] eCoords,
            int[][] sCoords) {
        this.instance = inst;
        this.w = w;
        this.h = h;
        this.entityIds = eIds;
        this.entityCoordinates = eCoords;
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
        for (int i = 0; i < entityCoordinates.length; i++) {
            if (entityCoordinates[i][0] <= x && entityCoordinates[i][2] >= x) {
                if (entityCoordinates[i][1] <= y && entityCoordinates[i][3] >= y) {
                    return true;
                }
            }
        }

        return false;
    }
}
