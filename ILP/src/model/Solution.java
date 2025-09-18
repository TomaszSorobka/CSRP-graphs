package model;
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.awt.Point;

public class Solution {
    public StatementEntityInstance instance;
    public int w;
    public int h;
    ArrayList<Integer> entityIds;
    public int[][] entityCoordinates;
    public int[][] statementCoordinates;
    public ArrayList<Point> cells;

    public Solution(StatementEntityInstance inst, int w, int h, ArrayList<Integer> eIds, int[][] eCoords, int[][] sCoords) {
        this.instance = inst;
        this.w = w;
        this.h = h;
        this.entityIds = eIds;
        this.entityCoordinates = eCoords;
        this.statementCoordinates = sCoords;
        this.cells = setCells();
    }

    private ArrayList<Point> setCells() {
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

    public static void combineSolutionsIntoFile(int w, int h, ArrayList<Solution> solutions, String filename) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            writer.write("w: " + w + "\n");
            writer.write("h: " + h + "\n");

            for (Solution solution : solutions) {
                int i = 0;
                for (Integer entity : solution.instance.entities.keySet()) {
                    writer.write("Entity " + solution.instance.entities.get(entity) + ": (" +
                            solution.entityCoordinates[i][0] + ", " +
                            solution.entityCoordinates[i][1] + ") - (" +
                            solution.entityCoordinates[i][2] + ", " +
                            solution.entityCoordinates[i][3] + ")\n");
                    i++;
                }
            }

            for (Solution solution : solutions) {
                int j = 0;
                for (Integer statement : solution.instance.statements.keySet()) {
                    writer.write("Statement " + solution.instance.statements.get(statement) + ": (" +
                            solution.statementCoordinates[j][0] + ", " +
                            solution.statementCoordinates[j][1] + ")\n");
                    j++;
                }
            }

            System.out.println("Solution saved to " + filename);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void saveSolutionToFile(String filename) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            writer.write("w: " + this.w + "\n");
            writer.write("h: " + this.h + "\n");

            int i = 0;
            for (Integer entity : instance.entities.keySet()) {
                writer.write("Entity " + instance.entities.get(entity) + ": (" +
                        this.entityCoordinates[i][0] + ", " +
                        this.entityCoordinates[i][1] + ") - (" +
                        this.entityCoordinates[i][2] + ", " +
                        this.entityCoordinates[i][3] + ")\n");
                i++;
            }

            int j = 0;
            for (Integer statement : instance.statements.keySet()) {
                writer.write("Statement " + instance.statements.get(statement) + ": (" +
                        this.statementCoordinates[j][0] + ", " +
                        this.statementCoordinates[j][1] + ")\n");
                j++;
            }

            System.out.println("Solution saved to " + filename);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
