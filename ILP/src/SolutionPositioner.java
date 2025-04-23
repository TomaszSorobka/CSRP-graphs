import java.awt.Point;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBEnv;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;
import com.gurobi.gurobi.GRBModel;
import com.gurobi.gurobi.GRBVar;

public class SolutionPositioner {
    static final int GRID_WIDTH = 30;
    static final int GRID_HEIGHT = 30;

    public static void computeCompleteSolution(ArrayList<Solution> components, String filename) {
        final int nSolutions = components.size();

        int[][] solutionCoordinates = new int[nSolutions][2];

        try {
            GRBEnv env = new GRBEnv();
            GRBModel model = new GRBModel(env);

            // Cell occupation grid
            GRBVar[][] cellUsed = new GRBVar[GRID_WIDTH][GRID_HEIGHT];
            for (int x = 0; x < GRID_WIDTH; x++) {
                for (int y = 0; y < GRID_HEIGHT; y++) {
                    cellUsed[x][y] = model.addVar(0, 1, 0, GRB.BINARY, "cellUsed_" + x + "_" + y);
                }
            }

            // Variables: component placement
            Map<String, GRBVar> placementVars = new HashMap<>();
            for (int s = 0; s < nSolutions; s++) {
                Solution sol = components.get(s);
                for (int x = 0; x < GRID_WIDTH; x++) {
                    for (int y = 0; y < GRID_HEIGHT; y++) {
                        if (fits(sol, x, y)) {
                            String varName = "place_" + s + "_" + x + "_" + y;
                            GRBVar var = model.addVar(0, 1, 0, GRB.BINARY, varName);
                            placementVars.put(varName, var);
                        }
                    }
                }
            }

            // Each component placed exactly once
            for (int s = 0; s < nSolutions; s++) {
                GRBLinExpr expr = new GRBLinExpr();
                for (int x = 0; x < GRID_WIDTH; x++) {
                    for (int y = 0; y < GRID_HEIGHT; y++) {
                        String key = "place_" + s + "_" + x + "_" + y;
                        if (placementVars.containsKey(key)) {
                            expr.addTerm(1, placementVars.get(key));
                        }
                    }
                }
                model.addConstr(expr, GRB.EQUAL, 1, "one_placement_" + s);
            }

            // Mark occupied cells by component placements
            for (int x = 0; x < GRID_WIDTH; x++) {
                for (int y = 0; y < GRID_HEIGHT; y++) {
                    GRBLinExpr usedSum = new GRBLinExpr();

                    for (int s = 0; s < nSolutions; s++) {
                        for (int ox = 0; ox < GRID_WIDTH; ox++) {
                            for (int oy = 0; oy < GRID_HEIGHT; oy++) {
                                String key = "place_" + s + "_" + ox + "_" + oy;
                                if (!placementVars.containsKey(key)) continue;

                                for (Point p : components.get(s).cells) {
                                    if (ox + p.x == x && oy + p.y == y) {
                                        usedSum.addTerm(1, placementVars.get(key));
                                    }
                                }
                            }
                        }
                    }

                    model.addConstr(cellUsed[x][y], GRB.EQUAL, usedSum, "exact_use_" + x + "_" + y);
                }
            }

            // No overlapping: each cell used at most once
            for (int x = 0; x < GRID_WIDTH; x++) {
                for (int y = 0; y < GRID_HEIGHT; y++) {
                    model.addConstr(cellUsed[x][y], GRB.LESS_EQUAL, 1, "no_overlap_" + x + "_" + y);
                }
            }

            // Bounding box width/height
            GRBVar W = model.addVar(0, GRID_WIDTH, 0, GRB.INTEGER, "W");
            GRBVar H = model.addVar(0, GRID_HEIGHT, 0, GRB.INTEGER, "H");

            // Ensure bounding box contains all used cells
            for (int x = 0; x < GRID_WIDTH; x++) {
                for (int y = 0; y < GRID_HEIGHT; y++) {
                    GRBLinExpr exprW = new GRBLinExpr();
                    exprW.addTerm(x, cellUsed[x][y]);
                    model.addConstr(W, GRB.GREATER_EQUAL, exprW, "boundW_" + x + "_" + y);

                    GRBLinExpr exprH = new GRBLinExpr();
                    exprH.addTerm(y, cellUsed[x][y]);
                    model.addConstr(H, GRB.GREATER_EQUAL, exprH, "boundH_" + x + "_" + y);
                }
            }

            // Set optimization objective
            GRBLinExpr totalSize = new GRBLinExpr();
            totalSize.addTerm(1, W);
            totalSize.addTerm(1, H);

            // Minimize bounding area
            model.setObjective(totalSize, GRB.MINIMIZE);

            model.optimize();

            // Output
            int solIndex = 0;
            for (String key : placementVars.keySet()) {
                if (placementVars.get(key).get(GRB.DoubleAttr.X) > 0) {
                    int x = Integer.parseInt(key.substring(8, 9));
                    int y = Integer.parseInt(key.substring(10, 11));

                    solutionCoordinates[solIndex][0] = x;
                    solutionCoordinates[solIndex][1] = y;

                    solIndex++;
                }
            }

            // Update coordinates according to positions
            offsetCoords(components, solutionCoordinates);

            System.out.println("Bounding Box: " + W.get(GRB.DoubleAttr.X) + " x " + H.get(GRB.DoubleAttr.X));

            // Generate solution file
            Solution.combineSolutionsIntoFile((int) W.get(GRB.DoubleAttr.X), (int) H.get(GRB.DoubleAttr.X), components, filename);

            // Clean up
            model.dispose();
            env.dispose();

        }   catch (GRBException e) {
            System.out.println("Error code: " + e.getErrorCode() + ". " + e.getMessage());
        }
    }

    private static boolean fits(Solution sol, int offsetX, int offsetY) {
        for (Point p : sol.cells) {
            int x = offsetX + p.x;
            int y = offsetY + p.y;
            if (x >= GRID_WIDTH || y >= GRID_HEIGHT) return false;
        }
        return true;
    }

    private static void offsetCoords(ArrayList<Solution> components, int[][] offsets) {
        for (int s = 0; s < components.size(); s++) {
            int x = offsets[s][0];
            int y = offsets[s][1];

            for (int[] entity : components.get(s).entityCoordinates) {
                entity[0] += x;
                entity[1] += y;
                entity[2] += x;
                entity[3] += y;
            }

            for (int[] statement : components.get(s).statementCoordinates) {
                statement[0] += x;
                statement[1] += y;
            }
        }
    }
}
