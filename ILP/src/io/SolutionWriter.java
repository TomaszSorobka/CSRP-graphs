package io;

import model.Solution;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;

public class SolutionWriter {

    private final Solution solution;

    public SolutionWriter(Solution solution) {
        this.solution = solution;
    }

    public void saveToFile(String filename) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            writer.write("w: " + solution.w + "\n");
            writer.write("h: " + solution.h + "\n");

            int i = 0;
            for (Integer entity : solution.instance.entities.keySet()) {
                writer.write("Entity " + solution.instance.entities.get(entity) + ": (" +
                        solution.entityCoordinates[i][0] + ", " +
                        solution.entityCoordinates[i][1] + ") - (" +
                        solution.entityCoordinates[i][2] + ", " +
                        solution.entityCoordinates[i][3] + ")\n");
                i++;
            }

            int j = 0;
            for (Integer statement : solution.instance.statements.keySet()) {
                writer.write("Statement " + solution.instance.statements.get(statement) + ": (" +
                        solution.statementCoordinates[j][0] + ", " +
                        solution.statementCoordinates[j][1] + ")\n");
                j++;
            }

            System.out.println("Solution saved to " + filename);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    // Optional: static utility method to write multiple solutions together
    public static void saveMultipleToFile(ArrayList<Solution> solutions, int w, int h, String filename) {
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
}
