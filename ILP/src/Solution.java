import java.util.ArrayList;

public class Solution {
    int w;
    int h;
    ArrayList<Integer> entityIds;
    int[][] entityCoordinates;
    int[][] statementCoordinates;

    public Solution(int w, int h, ArrayList<Integer> eIds, int[][] eCoords, int[][] sCoords) {
        this.w = w;
        this.h = h;
        this.entityIds = eIds;
        this.entityCoordinates = eCoords;
        this.statementCoordinates = sCoords;
    }
}
