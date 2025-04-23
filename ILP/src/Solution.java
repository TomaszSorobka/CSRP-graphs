import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;

public class Solution {
    StatementEntityInstance instance;
    int w;
    int h;
    ArrayList<Integer> entityIds;
    int[][] entityCoordinates;
    int[][] statementCoordinates;

    public Solution(StatementEntityInstance inst, int w, int h, ArrayList<Integer> eIds, int[][] eCoords, int[][] sCoords) {
        this.instance = inst;
        this.w = w;
        this.h = h;
        this.entityIds = eIds;
        this.entityCoordinates = eCoords;
        this.statementCoordinates = sCoords;
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
