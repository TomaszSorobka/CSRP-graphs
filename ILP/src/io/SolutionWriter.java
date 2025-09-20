package io;

import model.PolygonSolution;
import model.RectangleSolution;
import model.Solution;

import java.awt.Point;
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import java.util.stream.Collectors;

public class SolutionWriter {

    private final Solution solution;

    public SolutionWriter(Solution solution) {
        this.solution = solution;
    }

    public static void saveRectangleSolutionToFile(RectangleSolution s, String filename) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            writer.write("w: " + s.getW() + "\n");
            writer.write("h: " + s.getH() + "\n");

            extractRectangleEntities(s, writer);

            int j = 0;
            for (Integer statement : s.getInstance().statements.keySet()) {
                writer.write("Statement " + s.getInstance().statements.get(statement) + ": (" +
                        s.statementCoordinates[j][0] + ", " +
                        s.statementCoordinates[j][1] + ")\n");
                j++;
            }

            System.out.println("Solution saved to " + filename);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static void extractRectangleEntities(RectangleSolution s, BufferedWriter writer) throws IOException {
        int i = 0;
        for (Integer entity : s.getInstance().entities.keySet()) {
            writer.write("Entity " + s.getInstance().entities.get(entity) + ": (" +
                    s.entityCoordinates[i][0] + ", " +
                    s.entityCoordinates[i][1] + ") - (" +
                    s.entityCoordinates[i][2] + ", " +
                    s.entityCoordinates[i][3] + ")\n");
            i++;
        }
    }

    public static void savePolygonSolutionToFile(PolygonSolution s, String filename) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            writer.write("w: " + s.getW() + "\n");
            writer.write("h: " + s.getH() + "\n");

            extractPolygonEntities(s, writer);

            int j = 0;
            for (Integer statement : s.getInstance().statements.keySet()) {
                writer.write("Statement " + s.getInstance().statements.get(statement) + ": (" +
                        s.statementCoordinates[j][0] + ", " +
                        s.statementCoordinates[j][1] + ")\n");
                j++;
            }

            System.out.println("Solution saved to " + filename);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static void extractPolygonEntities(PolygonSolution s, BufferedWriter writer) throws IOException {
        int i = 0;
        for (Integer entity : s.getInstance().entities.keySet()) {
            // Add entity corners starting from the beginning of the first row and going
            // clockwise
            String entityString = "Entity " + s.getInstance().entities.get(entity) + ": ";
            ArrayList<Point> entityCorners = new ArrayList<>();

            int firstActiveRow = 0;
            int lastActiveRow = s.entities[i].length - 1;

            // Add the beginning and end of the first row
            for (int j = 0; j < s.entities[i].length; j++) {
                if (s.entities[i][j][0] > 0) {
                    firstActiveRow = j;

                    entityCorners.add(new Point(s.entities[i][j][1], j));
                    entityCorners.add(new Point(s.entities[i][j][2], j));

                    break;
                }
            }

            // Add points on the right side
            for (int j = firstActiveRow + 1; j < s.entities[i].length; j++) {
                if (s.entities[i][j][0] > 0) {
                    lastActiveRow = j;

                    // row ends after the previous one (|_)
                    if (s.entities[i][j - 1][2] < s.entities[i][j][2]) {
                        entityCorners.add(new Point(s.entities[i][j - 1][2], j));
                        entityCorners.add(new Point(s.entities[i][j][2], j));
                    }
                    // row ends before the previous one (‾|)
                    else if (s.entities[i][j - 1][2] > s.entities[i][j][2]) {
                        entityCorners.add(new Point(s.entities[i][j - 1][2], j - 1));
                        entityCorners.add(new Point(s.entities[i][j][2], j - 1));
                    }
                }
            }

            // Add the beginning of the last active row
            entityCorners.add(new Point(s.entities[i][lastActiveRow][1], lastActiveRow));

            // Add points on the left side
            for (int j = lastActiveRow - 1; j >= firstActiveRow; j--) {
                if (s.entities[i][j][0] > 0) {
                    // row starts after the previous one (_|)
                    if (s.entities[i][j + 1][1] < s.entities[i][j][1]) {
                        entityCorners.add(new Point(s.entities[i][j + 1][1], j + 1));
                        entityCorners.add(new Point(s.entities[i][j][1], j + 1));
                    }
                    // row starts before the previous one (|‾)
                    else if (s.entities[i][j + 1][1] > s.entities[i][j][1]) {
                        entityCorners.add(new Point(s.entities[i][j + 1][1], j));
                        entityCorners.add(new Point(s.entities[i][j][1], j));
                    }
                }
            }

            // If some cells were added twice remove the second copy
            removeDuplicates(entityCorners);

            // Combine points into a string
            String corners = entityCorners.stream()
                    .map(p -> "(" + p.x + ", " + p.y + ")")
                    .collect(Collectors.joining(" - "));

            entityString += corners;
            entityString += "\n";

            writer.write(entityString);
            i++;
        }
    }

    private static void removeDuplicates(ArrayList<Point> points) {
        Set<String> seen = new HashSet<>();
        Iterator<Point> it = points.iterator();

        while (it.hasNext()) {
            Point p = it.next();
            String key = p.x + "," + p.y;
            if (seen.contains(key)) {
                it.remove(); // remove later duplicates
            } else {
                seen.add(key); // keep first time
            }
        }
    }

    public void saveToFile(String filename) {
        if (this.solution instanceof RectangleSolution s) {
            saveRectangleSolutionToFile(s, filename);
        }
        else if (this.solution instanceof PolygonSolution s) {
            savePolygonSolutionToFile(s, filename);
        }
    }

    // Optional: static utility method to write multiple solutions together
    public static void saveMultipleToFile(ArrayList<Solution> solutions, int w, int h, String filename) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            writer.write("w: " + w + "\n");
            writer.write("h: " + h + "\n");

            for (Solution solution : solutions) {
                if (solution instanceof RectangleSolution s) {
                    extractRectangleEntities(s, writer);
                }
                else if (solution instanceof PolygonSolution s) {
                    extractPolygonEntities(s, writer);
                }
            }

            for (Solution solution : solutions) {
                if (solution instanceof RectangleSolution s) {
                    int j = 0;
                    for (Integer statement : s.getInstance().statements.keySet()) {
                        writer.write("Statement " + solution.getInstance().statements.get(statement) + ": (" +
                                s.statementCoordinates[j][0] + ", " +
                                s.statementCoordinates[j][1] + ")\n");
                        j++;
                    }
                }
                else if (solution instanceof PolygonSolution s) {
                    int j = 0;
                    for (Integer statement : s.getInstance().statements.keySet()) {
                        writer.write("Statement " + solution.getInstance().statements.get(statement) + ": (" +
                                s.statementCoordinates[j][0] + ", " +
                                s.statementCoordinates[j][1] + ")\n");
                        j++;
                    }
                }
            }

            System.out.println("Solution saved to " + filename);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
