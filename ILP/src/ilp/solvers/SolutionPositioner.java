package ilp.solvers;

import java.awt.Point;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBEnv;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;
import com.gurobi.gurobi.GRBModel;
import com.gurobi.gurobi.GRBVar;

import model.PolygonSolution;
import model.PositionedSolution;
import model.RectangleSolution;
import model.Solution;

public class SolutionPositioner {
    static final int GRID_WIDTH = 30;
    static final int GRID_HEIGHT = 30;

    public static PositionedSolution computeCompleteSolution(ArrayList<Solution> components) {
        final int nSolutions = components.size();
        int[][] solutionCoordinates = new int[nSolutions][2];

        try {
            GRBEnv env = new GRBEnv();
            GRBModel model = new GRBModel(env);

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

            // Each component must be placed exactly once
            for (int s = 0; s < nSolutions; s++) {
                GRBLinExpr expr = new GRBLinExpr();
                for (int x = 0; x < GRID_WIDTH; x++) {
                    for (int y = 0; y < GRID_HEIGHT; y++) {
                        String key = "place_" + s + "_" + x + "_" + y;
                        if (placementVars.containsKey(key)) {
                            expr.addTerm(1.0, placementVars.get(key));
                        }
                    }
                }
                model.addConstr(expr, GRB.EQUAL, 1.0, "one_placement_" + s);
            }

            // For each grid cell (gx, gy), gather all placements that cover it
            Map<String, List<GRBVar>> cellCoveringPlacements = new HashMap<>();

            for (int s = 0; s < nSolutions; s++) {
                Solution sol = components.get(s);
                for (int ox = 0; ox < GRID_WIDTH; ox++) {
                    for (int oy = 0; oy < GRID_HEIGHT; oy++) {
                        String key = "place_" + s + "_" + ox + "_" + oy;
                        if (!placementVars.containsKey(key))
                            continue;

                        GRBVar placeVar = placementVars.get(key);
                        for (Point p : sol.getCells()) {
                            int gx = ox + p.x;
                            int gy = oy + p.y;
                            if (gx >= 0 && gx < GRID_WIDTH && gy >= 0 && gy < GRID_HEIGHT) {
                                String cellKey = gx + "," + gy;
                                cellCoveringPlacements.computeIfAbsent(cellKey, k -> new ArrayList<>()).add(placeVar);
                            }
                        }
                    }
                }
            }

            // No overlapping i.e. sum of placements covering a cell is at most 1
            for (Map.Entry<String, List<GRBVar>> entry : cellCoveringPlacements.entrySet()) {
                String[] parts = entry.getKey().split(",");
                int x = Integer.parseInt(parts[0]);
                int y = Integer.parseInt(parts[1]);

                GRBLinExpr expr = new GRBLinExpr();
                for (GRBVar var : entry.getValue()) {
                    expr.addTerm(1.0, var);
                }
                model.addConstr(expr, GRB.LESS_EQUAL, 1.0, "no_overlap_" + x + "_" + y);
            }

            // Bounding box width/height (0-based dimensions)
            GRBVar W = model.addVar(0, GRID_WIDTH, 0, GRB.INTEGER, "W");
            GRBVar H = model.addVar(0, GRID_HEIGHT, 0, GRB.INTEGER, "H");

            // For each cell that might be occupied, enforce bounding box constraints
            for (Map.Entry<String, List<GRBVar>> entry : cellCoveringPlacements.entrySet()) {
                String[] parts = entry.getKey().split(",");
                int gx = Integer.parseInt(parts[0]);
                int gy = Integer.parseInt(parts[1]);

                for (GRBVar var : entry.getValue()) {
                    GRBLinExpr exprW = new GRBLinExpr();
                    exprW.addTerm(gx, var);
                    model.addConstr(W, GRB.GREATER_EQUAL, exprW, "boundW_" + gx + "_" + gy);

                    GRBLinExpr exprH = new GRBLinExpr();
                    exprH.addTerm(gy, var);
                    model.addConstr(H, GRB.GREATER_EQUAL, exprH, "boundH_" + gx + "_" + gy);
                }
            }

            // Objective: Minimize W + H
            GRBLinExpr totalSize = new GRBLinExpr();
            totalSize.addTerm(1.0, W);
            totalSize.addTerm(1.0, H);

            // Squareness
            GRBVar A = model.addVar(0.0, GRID_WIDTH, 0.0, GRB.CONTINUOUS, "AspectDiff");
            GRBLinExpr expr1 = new GRBLinExpr();
            expr1.addTerm(1.0, A);
            expr1.addTerm(1.0, W);
            expr1.addTerm(-1.0, H);
            
            GRBLinExpr expr2 = new GRBLinExpr();
            expr2.addTerm(1.0, A);
            expr2.addTerm(-1.0, W);
            expr2.addTerm(1.0, H);
            

            model.addConstr(expr1, GRB.GREATER_EQUAL, 0, "A_ge_HW");
            model.addConstr(expr2, GRB.GREATER_EQUAL, 0, "A_ge_WH");

            totalSize.addTerm(0.1, A);

            model.setObjective(totalSize, GRB.MINIMIZE);
            model.optimize();

            // Extract solution
            for (String key : placementVars.keySet()) {
                if (placementVars.get(key).get(GRB.DoubleAttr.X) > 0.5) {
                    String[] parts = key.split("_");
                    int s = Integer.parseInt(parts[1]);
                    int x = Integer.parseInt(parts[2]);
                    int y = Integer.parseInt(parts[3]);

                    solutionCoordinates[s][0] = x;
                    solutionCoordinates[s][1] = y;
                }
            }

            // Update component coordinates
            offsetCoords(components, solutionCoordinates);

            System.out.println("Bounding Box: " + W.get(GRB.DoubleAttr.X) + " x " + H.get(GRB.DoubleAttr.X));

            return new PositionedSolution(components, (int) W.get(GRB.DoubleAttr.X), (int) H.get(GRB.DoubleAttr.X));

        } catch (GRBException e) {
            System.out.println("Error code: " + e.getErrorCode() + ". " + e.getMessage());
        }

        return null;
    }

    // Check if a component can be placed in this grid position
    private static boolean fits(Solution sol, int offsetX, int offsetY) {
        for (Point p : sol.getCells()) {
            int x = offsetX + p.x;
            int y = offsetY + p.y;
            if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT)
                return false;
        }
        return true;
    }

    // Shift coordinates of all component cells based on that component's position
    // in the grid
    private static void offsetCoords(ArrayList<Solution> components, int[][] offsets) {
        for (int s = 0; s < components.size(); s++) {
            int x = offsets[s][0];
            int y = offsets[s][1];

            if (components.get(s) instanceof RectangleSolution rs) {
                for (int[] entity : rs.entityCoordinates) {
                    entity[0] += x;
                    entity[1] += y;
                    entity[2] += x;
                    entity[3] += y;
                }

                for (int[] statement : rs.statementCoordinates) {
                    statement[0] += x;
                    statement[1] += y;
                }
            } else if (components.get(s) instanceof PolygonSolution ps) {
                for (int[][] entity : ps.entities) {
                    // Shift x coordinates
                    for (int i = 0; i < entity.length; i++) {
                        entity[i][1] += x;
                        entity[i][2] += x;
                    }
                    // TODO figure out if this works
                    // Replace the active row booleans with integers storing the y coordinate of the
                    // row in the overall solution
                    // Note: y coordinates are artificially increased by 1 to differentiate them
                    // from inactive rows
                    for (int i = 0; i < entity.length; i++) {
                        if (entity[i][0] == 1) {
                            entity[i][0] += i + y;
                        }
                    }
                }

                for (int[] statement : ps.statementCoordinates) {
                    statement[0] += x;
                    statement[1] += y;
                }
            }
        }
    }
}