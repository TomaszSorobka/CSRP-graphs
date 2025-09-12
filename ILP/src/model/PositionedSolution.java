package model;

import java.util.ArrayList;

public class PositionedSolution {
    public final ArrayList<Solution> solutions;
    public final int width;
    public final int height;

    public PositionedSolution(ArrayList<Solution> solutions, int width, int height) {
        this.solutions = solutions;
        this.width = width;
        this.height = height;
    }
}