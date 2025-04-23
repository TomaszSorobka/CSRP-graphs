import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBEnv;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;
import com.gurobi.gurobi.GRBModel;
import com.gurobi.gurobi.GRBVar;

public class StatementEntitySolution {

    // StatementEntityInstance instance;
    // // Solution representation - coordinate of top left corner and bottom right
    // corner of each entity
    // // entity 0 has coordinates entityCoordinates[0] = {xt, yt, xb, yb}
    // int[][] entityCoordinates;
    // // same for statements
    // int[][] statementCoordinates;

    // // Total dimensions of the solution
    // int w;
    // int h;

    // // shorthand for the number of entities and statements
    // int nEntities;
    // int nStatements;

    // // List of entity IDs
    // List<Integer> entityIds;

    // // List of statement IDs
    // List<Integer> statementIds;

    // // cost of the solution
    // double cost;

    // // dimensions of the entities and statements, statementDimensions[i] =
    // {width, height}
    // double[] statementDimensions;

    // public StatementEntitySolution(StatementEntityInstance instance) {
    // this.instance = instance;
    // nEntities = instance.numberOfEntities;
    // nStatements = instance.numberOfStatements;
    // entityIds = new ArrayList<>(instance.entities.keySet());
    // statementIds = new ArrayList<>(instance.statements.keySet());

    // entityCoordinates = new int[nEntities][4];
    // statementCoordinates = new int[nStatements][2];
    // statementDimensions = new double[2]; // width, height
    // }

    ArrayList<Solution> solutions = new ArrayList<>();
    HashSet<Integer> deletedNodes = new HashSet<>();
    HashMap<Integer, int[]> deletedPositions = new HashMap<>();
    ArrayList<Integer> pastAlignments = new ArrayList<>();
    final int dimensions = 4;

    // Method to make a copy of the solution
    // public StatementEntitySolution copy() {
    // StatementEntitySolution copy = new StatementEntitySolution(instance);

    // for (int i = 0; i < nEntities; i++) {
    // copy.entityCoordinates[i][0] = entityCoordinates[i][0];
    // copy.entityCoordinates[i][1] = entityCoordinates[i][1];
    // copy.entityCoordinates[i][2] = entityCoordinates[i][2];
    // copy.entityCoordinates[i][3] = entityCoordinates[i][3];
    // }

    // for (int i = 0; i < nStatements; i++) {
    // copy.statementCoordinates[i][0] = statementCoordinates[i][0];
    // copy.statementCoordinates[i][1] = statementCoordinates[i][1];
    // }

    // copy.statementDimensions[0] = statementDimensions[0];
    // copy.statementDimensions[1] = statementDimensions[1];
    // copy.cost = cost;
    // return copy;
    // }

    // Method to compute the best solution with ILP
    public void computeILPCoord(StatementEntityInstance instance, ArrayList<Solution> sols) {
        // Setup
        final int nEntities = instance.numberOfEntities;
        final int nStatements = instance.numberOfStatements;
        ArrayList<Integer> entityIds = new ArrayList<>(instance.entities.keySet());
        ArrayList<Integer> statementIds = new ArrayList<>(instance.statements.keySet());

        // System.out.println("nStatements " + nStatements);
        // System.out.println("statementIds " + statementIds.size());

        // System.out.println("statement ids");
        // for (Integer integer : statementIds) {
        // System.out.println(integer);
        // }

        int w;
        int h;
        int[][] entityCoordinates = new int[entityIds.size()][4];
        int[][] statementCoordinates = new int[statementIds.size()][2];

        try {
            GRBEnv env = new GRBEnv();
            GRBModel model = new GRBModel(env);

            // Create variables
            GRBVar[][] grbStatementCoord = new GRBVar[statementIds.size()][2];
            GRBVar[][] grbEntityCoord = new GRBVar[entityIds.size()][4];

            for (int i = 0; i < nStatements; i++) {
                grbStatementCoord[i][0] = model.addVar(0, 20, 0.0, GRB.INTEGER, "s" + i + "_" + "x");
                grbStatementCoord[i][1] = model.addVar(0, 20, 0.0, GRB.INTEGER, "s" + i + "_" + "y");

            }

            for (int i = 0; i < nEntities; i++) {
                for (int j = 0; j < 4; j++) {
                    grbEntityCoord[i][j] = model.addVar(0, 20, 0.0, GRB.INTEGER,
                            "e" + i + "_" + (j % 2 == 0 ? "x" : "y") + (j / 2 == 0 ? "_t" : "_b"));
                }
            }

            /*********************************************************************************************************
             * CONSTRAINTS *
             *********************************************************************************************************/

            // System.out.println("Entity is in component: " + entityIds.contains(0) +
            // "\nEntity position is in hashmap: "
            // + deletedYPositions.containsKey(0));
            // System.out.println();
            // for (Integer id : deletedYPositions.keySet()) {
            // System.out.println("Entity, yPos: " + id + ", " + deletedYPositions.get(id));
            // }
            GRBVar b = model.addVar(0, 1, 0.0, GRB.BINARY, "useYAlignment");

            // TEST CONSTRAINT FOR Y COORDINATE OR X COORDINATE OF DELETED NODES
            for (Integer entityId : deletedNodes) {
                if (entityIds.contains(entityId) && deletedPositions.containsKey(entityId)) {
                    int entIndex = entityIds.indexOf(entityId);

                    int xTarget = deletedPositions.get(entityId)[0];
                    int yTarget = deletedPositions.get(entityId)[1];
                    int M = 1000;

                    // Constraint for y
                    // model.addConstr(grbEntityCoord[entIndex][1] - yTarget <= M * (1 - b1), ...);
                    // model.addConstr(yTarget - grbEntityCoord[entIndex][1] <= M * (1 - b1), ...);

                    // ---- y == yTarget if b == 1 ----
                    // y - yTarget <= M * (1 - b) ----> y + M*b <= yTarget + M
                    GRBLinExpr yExpr1 = new GRBLinExpr();
                    yExpr1.addTerm(1.0, grbEntityCoord[entIndex][1]); // y
                    yExpr1.addTerm(M, b);
                    model.addConstr(yExpr1, GRB.LESS_EQUAL, yTarget + M, "y_upper_" + entityId);

                    // yTarget - y <= M * (1 - b) ----> y - M*b >= yTarget - M
                    GRBLinExpr yExpr2 = new GRBLinExpr();
                    yExpr2.addTerm(1.0, grbEntityCoord[entIndex][1]); // y
                    yExpr2.addTerm(-M, b);
                    model.addConstr(yExpr2, GRB.GREATER_EQUAL, yTarget - M, "y_lower_" + entityId);

                    // ---- x == xTarget if b == 0 ----
                    // x - xTarget <= M * b ----> x - M*b <= xTarget
                    GRBLinExpr xExpr1 = new GRBLinExpr();
                    xExpr1.addTerm(1.0, grbEntityCoord[entIndex][0]); // y
                    xExpr1.addTerm(-M, b);
                    model.addConstr(xExpr1, GRB.LESS_EQUAL, xTarget, "x_upper_" + entityId);

                    // xTarget - x <= M * b ----> x + M*b >= xTarget
                    GRBLinExpr xExpr2 = new GRBLinExpr();
                    xExpr2.addTerm(1.0, grbEntityCoord[entIndex][1]); // y
                    xExpr2.addTerm(M, b);
                    model.addConstr(xExpr2, GRB.GREATER_EQUAL, xTarget, "x_lower_" + entityId);
                }
            }

            // All coordinates are non-negative (H0)
            for (int i = 0; i < nStatements; i++) {
                model.addConstr(grbStatementCoord[i][0], GRB.GREATER_EQUAL, 0, "H0_" + i + "_x");
                model.addConstr(grbStatementCoord[i][1], GRB.GREATER_EQUAL, 0, "H0_" + i + "_y");
            }
            for (int i = 0; i < nEntities; i++) {
                for (int j = 0; j < 4; j++) {
                    model.addConstr(grbEntityCoord[i][j], GRB.GREATER_EQUAL, 0, "H0_e_" + i + "_" + j);
                }
            }

            // All coordinates are at most 4 / Restrict solution size (H00)
            for (int i = 0; i < nStatements; i++) {
                model.addConstr(grbStatementCoord[i][0], GRB.LESS_EQUAL, dimensions, "H00_" + i + "_x");
                model.addConstr(grbStatementCoord[i][1], GRB.LESS_EQUAL, dimensions, "H00_" + i + "_y");
            }
            for (int i = 0; i < nEntities; i++) {
                for (int j = 0; j < 4; j++) {
                    model.addConstr(grbEntityCoord[i][j], GRB.LESS_EQUAL, dimensions, "H00_e_" + i + "_" + j);
                }
            }

            // Positioning statements inside entities (H1)
            for (int i = 0; i < nEntities; i++) {
                int[] statementsOfEntity = instance.entityIndToStatements.get(entityIds.get(i));
                for (int j = 0; j < statementsOfEntity.length; j++) {
                    int statementIndex = statementIds.indexOf(statementsOfEntity[j]);

                    // statement x >= entity x1 (right of entity's left side)
                    GRBLinExpr expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[statementIndex][0]);
                    expr.addTerm(-1.0, grbEntityCoord[i][0]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H1_" + i + "_" + statementIndex + "_x1");

                    // statement y >= entity y1 (below entity's top side)
                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[statementIndex][1]);
                    expr.addTerm(-1.0, grbEntityCoord[i][1]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H1_" + i + "_" + statementIndex + "_y1");

                    // statement x <= entity x2 (left of entity's right side)
                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbEntityCoord[i][2]);
                    expr.addTerm(-1.0, grbStatementCoord[statementIndex][0]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H1_" + i + "_" + statementIndex + "_x2");

                    // statement y <= entity y2 (above entity's bottom side)
                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbEntityCoord[i][3]);
                    expr.addTerm(-1.0, grbStatementCoord[statementIndex][1]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H1_" + i + "_" + statementIndex + "_y2");
                }

                // Keep statements outside of entities they do not belong to (H2)
                for (int j = 0; j < nStatements; j++) {
                    final int statementIdFinal = statementIds.get(j);
                    if (Arrays.stream(instance.entityIndToStatements.get(entityIds.get(i)))
                            .noneMatch(x -> x == statementIdFinal)) {

                        GRBVar[] vars = new GRBVar[4];
                        for (int k = 0; k < 4; k++) {
                            vars[k] = model.addVar(0.0, 1.0, 0.0, GRB.BINARY, "H2_" + i + "_" + j + "_" + k);
                        }

                        // x - x1 + M * vars[0] >= 0
                        GRBLinExpr expr = new GRBLinExpr();
                        expr.addTerm(-1.0, grbStatementCoord[j][0]);
                        expr.addTerm(1.0, grbEntityCoord[i][0]);
                        expr.addTerm(Integer.MAX_VALUE, vars[0]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H2_" + i + "_" + j + "_left");

                        // x2 - x + M * vars[1] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbStatementCoord[j][0]);
                        expr.addTerm(-1.0, grbEntityCoord[i][2]);
                        expr.addTerm(Integer.MAX_VALUE, vars[1]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H2_" + i + "_" + j + "_right");

                        // y1 - y + M * vars[2] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(-1.0, grbStatementCoord[j][1]);
                        expr.addTerm(1.0, grbEntityCoord[i][1]);
                        expr.addTerm(Integer.MAX_VALUE, vars[2]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H2_" + i + "_" + j + "_top");

                        // y - y2 + M * vars[3] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbStatementCoord[j][1]);
                        expr.addTerm(-1.0, grbEntityCoord[i][3]);
                        expr.addTerm(Integer.MAX_VALUE, vars[3]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H2_" + i + "_" + j + "_bottom");

                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, vars[0]);
                        expr.addTerm(1.0, vars[1]);
                        expr.addTerm(1.0, vars[2]);
                        expr.addTerm(1.0, vars[3]);
                        model.addConstr(expr, GRB.LESS_EQUAL, 3.0, "H2_" + i + "_" + j + "_sum");
                    }
                }
            }

            // Make entities with non-overlapping statements not overlap coordinates (H6)
            for (int i = 0; i < nEntities; i++) {
                for (int j = i + 1; j < nEntities; j++) {
                    int[] statementsOfEntity1 = instance.entityIndToStatements.get(entityIds.get(i));
                    int[] statementsOfEntity2 = instance.entityIndToStatements.get(entityIds.get(j));
                    boolean overlap = false;
                    for (int k = 0; k < statementsOfEntity1.length; k++) {
                        for (int l = 0; l < statementsOfEntity2.length; l++) {
                            if (statementsOfEntity1[k] == statementsOfEntity2[l]) {
                                overlap = true;
                                break;
                            }
                        }
                    }

                    if (!overlap) {

                        GRBVar[] vars = new GRBVar[4];
                        for (int k = 0; k < 4; k++) {
                            vars[k] = model.addVar(0.0, 1.0, 0.0, GRB.BINARY, "H6_" + i + "_" + j + "_" + k);
                        }

                        // x1_e1 - x2_e2 + M * vars[0] >= 0
                        GRBLinExpr expr = new GRBLinExpr();
                        expr.addTerm(-1.0, grbEntityCoord[j][2]);
                        expr.addTerm(1.0, grbEntityCoord[i][0]);
                        expr.addTerm(dimensions + 1, vars[0]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_left");

                        // x2_e1 - x1_e2 + M * vars[1] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbEntityCoord[j][0]);
                        expr.addTerm(-1.0, grbEntityCoord[i][2]);
                        expr.addTerm(dimensions + 1, vars[1]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_right");

                        // y1_e1 - y2_e2 + M * vars[2] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(-1.0, grbEntityCoord[j][3]);
                        expr.addTerm(1.0, grbEntityCoord[i][1]);
                        expr.addTerm(dimensions + 1, vars[2]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_top");

                        // y1_e2 - y2_e1 + M * vars[3] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbEntityCoord[j][1]);
                        expr.addTerm(-1.0, grbEntityCoord[i][3]);
                        expr.addTerm(dimensions + 1, vars[3]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_bottom");

                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, vars[0]);
                        expr.addTerm(1.0, vars[1]);
                        expr.addTerm(1.0, vars[2]);
                        expr.addTerm(1.0, vars[3]);
                        model.addConstr(expr, GRB.LESS_EQUAL, 3.0, "H6_" + i + "_" + j + "_sum");
                    }
                }
            }

            // Statements have distinct coordinates (H7)
            for (int i = 0; i < nStatements; i++) {
                for (int j = i + 1; j < nStatements; j++) {
                    GRBVar[] vars = new GRBVar[4];
                    for (int k = 0; k < 4; k++) {
                        vars[k] = model.addVar(0.0, 1.0, 0.0, GRB.BINARY, "H7_" + i + "_" + j + "_" + k);
                    }

                    GRBLinExpr expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][0]);
                    expr.addTerm(-1.0, grbStatementCoord[j][0]);
                    expr.addTerm(dimensions + 1, vars[0]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H7_" + i + "_" + j + "_x1");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][0]);
                    expr.addTerm(-1.0, grbStatementCoord[j][0]);
                    expr.addTerm(-(dimensions + 1), vars[1]);
                    model.addConstr(expr, GRB.LESS_EQUAL, -1, "H7_" + i + "_" + j + "_x2");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][1]);
                    expr.addTerm(-1.0, grbStatementCoord[j][1]);
                    expr.addTerm(dimensions + 1, vars[2]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H7_" + i + "_" + j + "_y1");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][1]);
                    expr.addTerm(-1.0, grbStatementCoord[j][1]);
                    expr.addTerm(-(dimensions + 1), vars[3]);
                    model.addConstr(expr, GRB.LESS_EQUAL, -1, "H7_" + i + "_" + j + "_y2");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, vars[0]);
                    expr.addTerm(1.0, vars[1]);
                    expr.addTerm(1.0, vars[2]);
                    expr.addTerm(1.0, vars[3]);
                    model.addConstr(expr, GRB.LESS_EQUAL, 3.0, "H7_" + i + "_" + j + "_sum");
                }
            }

            // Single statement entities take up only 1 cell (H5)
            for (int i = 0; i < nEntities; i++) {
                if (instance.entityIndToStatements.get(entityIds.get(i)).length == 1) {
                    GRBLinExpr expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbEntityCoord[i][2]);
                    expr.addTerm(-1.0, grbEntityCoord[i][0]);
                    model.addConstr(expr, GRB.EQUAL, 0, "H5_" + i + "_w");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbEntityCoord[i][3]);
                    expr.addTerm(-1.0, grbEntityCoord[i][1]);
                    model.addConstr(expr, GRB.EQUAL, 0, "H5_" + i + "_h");
                }
            }

            // Max width constraint (H8)
            GRBVar maxWidth = model.addVar(0.0, Integer.MAX_VALUE, 0.0, GRB.INTEGER, "maxWidth");

            for (int i = 0; i < nEntities; i++) {
                GRBLinExpr expr = new GRBLinExpr();
                expr.addTerm(1.0, maxWidth);
                expr.addTerm(-1.0, grbEntityCoord[i][2]);
                model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H8_" + i + "_w");

            }

            // Max height constraint (H9)
            GRBVar maxHeight = model.addVar(0.0, Integer.MAX_VALUE, 0.0, GRB.INTEGER, "maxHeight");

            for (int i = 0; i < nEntities; i++) {
                GRBLinExpr expr = new GRBLinExpr();
                expr.addTerm(1.0, maxHeight);
                expr.addTerm(-1.0, grbEntityCoord[i][3]);
                model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H9_" + i + "_h");

            }

            // Sum of width height constraint
            GRBLinExpr totalSize = new GRBLinExpr();
            totalSize.addTerm(1.0, maxHeight);
            totalSize.addTerm(1.0, maxWidth);
            model.addConstr(totalSize, GRB.LESS_EQUAL, 8.0, "total_layout_size");

            // Ensure squareness, difference between max width and max height is minimized
            // (H10)
            GRBVar diff = model.addVar(0.0, Integer.MAX_VALUE, 0.0, GRB.INTEGER, "diff");
            GRBLinExpr positiveDiff = new GRBLinExpr();
            positiveDiff.addTerm(1.0, diff);
            positiveDiff.addTerm(-1.0, maxWidth);
            positiveDiff.addTerm(1.0, maxHeight);
            model.addConstr(positiveDiff, GRB.GREATER_EQUAL, 0, "H10_+diff");

            GRBLinExpr negativeDiff = new GRBLinExpr();
            negativeDiff.addTerm(1.0, diff);
            negativeDiff.addTerm(1.0, maxWidth);
            negativeDiff.addTerm(-1.0, maxHeight);
            model.addConstr(negativeDiff, GRB.GREATER_EQUAL, 0, "H10_-diff");

            // // Balance alignments (we do not want only x or only y alignments)
            // int countY = Collections.frequency(pastAlignments, 1);
            // int countX = pastAlignments.size() - countY;
            // double lambda = 10.0; // tuning parameter

            // // penalty = lambda * (countY * b + countX * (1 - b))
            // GRBLinExpr balancePenalty = new GRBLinExpr();
            // balancePenalty.addTerm(lambda * countY, b);
            // balancePenalty.addConstant(lambda * countX); // because: lambda * countX * (1
            // - b)
            // balancePenalty.addTerm(-lambda * countX, b);

            // Objective function
            GRBLinExpr MINIMIZE_ME = new GRBLinExpr();
            MINIMIZE_ME.addTerm(1.0, diff);
            MINIMIZE_ME.addTerm(2.0, maxHeight);
            MINIMIZE_ME.addTerm(2.0, maxWidth);
            // MINIMIZE_ME.add(balancePenalty);

            for (int i = 0; i < nEntities; i++) {
                MINIMIZE_ME.addTerm(1.0, grbEntityCoord[i][2]);
                MINIMIZE_ME.addTerm(-1.0, grbEntityCoord[i][0]);
                MINIMIZE_ME.addTerm(1.0, grbEntityCoord[i][3]);
                MINIMIZE_ME.addTerm(-1.0, grbEntityCoord[i][1]);
            }

            // Favor top left
            for (int i = 0; i < nStatements; i++) {
                MINIMIZE_ME.addTerm(0.5, grbStatementCoord[i][0]);
                MINIMIZE_ME.addTerm(0.5, grbStatementCoord[i][1]);
            }

            model.setObjective(MINIMIZE_ME, GRB.MINIMIZE);

            // Set the time limit for the optimization (in seconds)
            // model.set(GRB.DoubleParam.TimeLimit, 30.0);

            if (nStatements > 25) {
                System.out.println("No optimal solution found.");

                GreedySplit splitInst = new GreedySplit(instance);
                ArrayList<StatementEntityInstance> split = splitInst.findSplit(5, 1.0 / 3);
                deletedNodes.addAll(splitInst.deletedEntities);
                // updateDeletedNodesMap(sols);

                for (StatementEntityInstance inst : split) {
                    computeILPCoord(inst, sols);
                }
            } else {
                model.optimize();

                // Check if the optimization was interrupted or completed successfully
                int status = model.get(GRB.IntAttr.Status);

                // Check if the optimization was interrupted or completed
                if (status == GRB.Status.OPTIMAL) {

                    // Extract solution
                    w = (int) maxWidth.get(GRB.DoubleAttr.X);
                    h = (int) maxHeight.get(GRB.DoubleAttr.X);

                    for (int i = 0; i < nEntities; i++) {
                        entityCoordinates[i][0] = (int) grbEntityCoord[i][0].get(GRB.DoubleAttr.X);
                        entityCoordinates[i][1] = (int) grbEntityCoord[i][1].get(GRB.DoubleAttr.X);
                        entityCoordinates[i][2] = (int) grbEntityCoord[i][2].get(GRB.DoubleAttr.X);
                        entityCoordinates[i][3] = (int) grbEntityCoord[i][3].get(GRB.DoubleAttr.X);
                    }

                    for (int i = 0; i < nStatements; i++) {
                        statementCoordinates[i][0] = (int) grbStatementCoord[i][0].get(GRB.DoubleAttr.X);
                        statementCoordinates[i][1] = (int) grbStatementCoord[i][1].get(GRB.DoubleAttr.X);
                    }

                    // Add deleted node positions to the hashmap
                    for (Integer entityId : deletedNodes) {
                        if (entityIds.contains(entityId) && !deletedPositions.keySet().contains(entityId)) {
                            deletedPositions.put(entityId,
                                    new int[] {
                                            (int) grbEntityCoord[entityIds.indexOf(entityId)][0].get(GRB.DoubleAttr.X),
                                            (int) grbEntityCoord[entityIds.indexOf(entityId)][1].get(GRB.DoubleAttr.X)
                                    });
                        }
                    }

                    // Add the alignment to the list
                    pastAlignments.add((int) b.get(GRB.DoubleAttr.X));

                    // Add solution to global list of solutions
                    Solution newSolution = new Solution(w, h, entityIds, entityCoordinates, statementCoordinates);
                    sols.add(newSolution);

                    saveSolutionToFile(newSolution, instance,
                            "Visualization/Solutions/museum_component_" + sols.size() + ".txt");
                } else {
                    System.out.println("No optimal solution found.");

                    GreedySplit splitInst = new GreedySplit(instance);
                    ArrayList<StatementEntityInstance> split = splitInst.findSplit(5, 1.0 / 3);
                    deletedNodes.addAll(splitInst.deletedEntities);
                    // updateDeletedNodesMap(sols);

                    for (StatementEntityInstance inst : split) {
                        computeILPCoord(inst, sols);
                    }
                }

                // Clean up
                model.dispose();
                env.dispose();
            }

        } catch (GRBException e) {
            System.out.println("Error code: " + e.getErrorCode() + ". " + e.getMessage());
        }
    }

    // If new entities were deleted we need to update the hashmap with coordinates
    // by adding the coordinates of the new deleted entities in a previous solution
    private void updateDeletedNodesMap(ArrayList<Solution> sols) {
        // if there are previous solutions
        if (!sols.isEmpty()) {
            for (Integer entId : deletedNodes) {
                if (!deletedPositions.keySet().contains(entId)) {
                    // Find a solution that contains that entity
                    int solIndex = -1;
                    for (int i = 0; i < sols.size(); i++) {
                        if (sols.get(i).entityIds.contains(entId)) {
                            solIndex = i;
                            break;
                        }
                    }

                    // Get the coordinates of the deleted entity from that solution
                    // and put them in the hashmap
                    if (solIndex != -1) {
                        int entIndex = sols.get(solIndex).entityIds.indexOf(entId);
                        deletedPositions.put(entId, new int[] {
                                sols.get(solIndex).entityCoordinates[entIndex][0],
                                sols.get(solIndex).entityCoordinates[entIndex][1],
                        });
                    }
                }
            }
        }
    }

    public static void saveSolutionToFile(Solution solution, StatementEntityInstance instance, String filename) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(filename))) {
            writer.write("w: " + solution.w + "\n");
            writer.write("h: " + solution.h + "\n");

            int i = 0;
            for (Integer entity : instance.entities.keySet()) {
                writer.write("Entity " + instance.entities.get(entity) + ": (" +
                        solution.entityCoordinates[i][0] + ", " +
                        solution.entityCoordinates[i][1] + ") - (" +
                        solution.entityCoordinates[i][2] + ", " +
                        solution.entityCoordinates[i][3] + ")\n");
                i++;
            }

            int j = 0;
            for (Integer statement : instance.statements.keySet()) {
                writer.write("Statement " + instance.statements.get(statement) + ": (" +
                        solution.statementCoordinates[j][0] + ", " +
                        solution.statementCoordinates[j][1] + ")\n");
                j++;
            }

            System.out.println("Solution saved to " + filename);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {
        String jsonFilePath = "ILP\\data\\museum.json";
        StatementEntityInstance instance = new StatementEntityInstance(jsonFilePath);
        StatementEntitySolution solution = new StatementEntitySolution();
        solution.computeILPCoord(instance, new ArrayList<>());
    }
}
