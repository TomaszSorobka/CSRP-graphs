public class Solution {
    int w;
    int h;
    int[][] entityCoordinates;
    int[][] statementCoordinates;

    public Solution(int w, int h, int[][] eCoords, int[][] sCoords) {
        this.w = w;
        this.h = h;
        this.entityCoordinates = eCoords;
        this.statementCoordinates = sCoords;
    }
}
