package model;

import java.util.ArrayList;
import java.awt.Point;
public interface Solution {
    StatementEntityInstance getInstance();

    int getW();
    int getH();

    ArrayList<Integer> getEntityIds();

    ArrayList<Point> setCells();
    ArrayList<Point> getCells();
}
