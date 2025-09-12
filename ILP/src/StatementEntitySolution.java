import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBEnv;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;
import com.gurobi.gurobi.GRBModel;
import com.gurobi.gurobi.GRBVar;

public class StatementEntitySolution {
    ArrayList<Solution> solutions = new ArrayList<>();
    HashSet<Integer> deletedNodes = new HashSet<>();
    HashMap<Integer, int[]> deletedPositions = new HashMap<>();
    ArrayList<Integer> pastAlignments = new ArrayList<>();
    final int dimensions = 4;
    final int M = dimensions + 1; // grid is [0..dimensions]

    // Method to compute the best solution with ILP
    public void computeILPCoord(StatementEntityInstance instance, ArrayList<Solution> sols) {
        // Setup
        final int nEntities = instance.numberOfEntities;
        final int nStatements = instance.numberOfStatements;
        ArrayList<Integer> entityIds = new ArrayList<>(instance.entities.keySet());
        ArrayList<Integer> statementIds = new ArrayList<>(instance.statements.keySet());

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

            GRBVar b = model.addVar(0, 1, 0.0, GRB.BINARY, "useYAlignment");

            // All coordinates are non-negative (C00)
            for (int i = 0; i < nStatements; i++) {
                model.addConstr(grbStatementCoord[i][0], GRB.GREATER_EQUAL, 0, "H0_" + i + "_x");
                model.addConstr(grbStatementCoord[i][1], GRB.GREATER_EQUAL, 0, "H0_" + i + "_y");
            }
            for (int i = 0; i < nEntities; i++) {
                for (int j = 0; j < 4; j++) {
                    model.addConstr(grbEntityCoord[i][j], GRB.GREATER_EQUAL, 0, "H0_e_" + i + "_" + j);
                }
            }

            // All coordinates are at most *dimensions* / Restrict solution size (C01)
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
                        expr.addTerm(M, vars[0]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H2_" + i + "_" + j + "_left");

                        // x2 - x + M * vars[1] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbStatementCoord[j][0]);
                        expr.addTerm(-1.0, grbEntityCoord[i][2]);
                        expr.addTerm(M, vars[1]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H2_" + i + "_" + j + "_right");

                        // y1 - y + M * vars[2] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(-1.0, grbStatementCoord[j][1]);
                        expr.addTerm(1.0, grbEntityCoord[i][1]);
                        expr.addTerm(M, vars[2]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H2_" + i + "_" + j + "_top");

                        // y - y2 + M * vars[3] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbStatementCoord[j][1]);
                        expr.addTerm(-1.0, grbEntityCoord[i][3]);
                        expr.addTerm(M, vars[3]);
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
                        expr.addTerm(M, vars[0]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_left");

                        // x2_e1 - x1_e2 + M * vars[1] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbEntityCoord[j][0]);
                        expr.addTerm(-1.0, grbEntityCoord[i][2]);
                        expr.addTerm(M, vars[1]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_right");

                        // y1_e1 - y2_e2 + M * vars[2] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(-1.0, grbEntityCoord[j][3]);
                        expr.addTerm(1.0, grbEntityCoord[i][1]);
                        expr.addTerm(M, vars[2]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_top");

                        // y1_e2 - y2_e1 + M * vars[3] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbEntityCoord[j][1]);
                        expr.addTerm(-1.0, grbEntityCoord[i][3]);
                        expr.addTerm(M, vars[3]);
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

            // Statements have distinct coordinates (C1)
            for (int i = 0; i < nStatements; i++) {
                for (int j = i + 1; j < nStatements; j++) {
                    GRBVar[] vars = new GRBVar[4];
                    for (int k = 0; k < 4; k++) {
                        vars[k] = model.addVar(0.0, 1.0, 0.0, GRB.BINARY, "H7_" + i + "_" + j + "_" + k);
                    }

                    GRBLinExpr expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][0]);
                    expr.addTerm(-1.0, grbStatementCoord[j][0]);
                    expr.addTerm(M, vars[0]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H7_" + i + "_" + j + "_x1");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][0]);
                    expr.addTerm(-1.0, grbStatementCoord[j][0]);
                    expr.addTerm(-1.0 * M, vars[1]);
                    model.addConstr(expr, GRB.LESS_EQUAL, -1, "H7_" + i + "_" + j + "_x2");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][1]);
                    expr.addTerm(-1.0, grbStatementCoord[j][1]);
                    expr.addTerm(M, vars[2]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H7_" + i + "_" + j + "_y1");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][1]);
                    expr.addTerm(-1.0, grbStatementCoord[j][1]);
                    expr.addTerm(-1.0 * M, vars[3]);
                    model.addConstr(expr, GRB.LESS_EQUAL, -1, "H7_" + i + "_" + j + "_y2");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, vars[0]);
                    expr.addTerm(1.0, vars[1]);
                    expr.addTerm(1.0, vars[2]);
                    expr.addTerm(1.0, vars[3]);
                    model.addConstr(expr, GRB.LESS_EQUAL, 3.0, "H7_" + i + "_" + j + "_sum");
                }
            }

            // Single statement entities take up only 1 cell (C2)
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

            // Objective function
            GRBLinExpr MINIMIZE_ME = new GRBLinExpr();
            MINIMIZE_ME.addTerm(1.0, diff);
            MINIMIZE_ME.addTerm(2.0, maxHeight);
            MINIMIZE_ME.addTerm(2.0, maxWidth);

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

            // If instance has more statements than could fit in the grid, split immediately
            if (nStatements > (Math.pow(dimensions + 1, 2))) {
                System.out.println("Instance too large.");

                getSplit(instance, sols);
            } else {
                model.optimize();

                // Check if the optimization was interrupted or completed successfully
                int status = model.get(GRB.IntAttr.Status);

                // Check if a solution was found
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
                    Solution newSolution = new Solution(instance, w, h, entityIds, entityCoordinates,
                            statementCoordinates);
                    sols.add(newSolution);

                    // Add component to class' solution list
                    solutions.add(newSolution);
                } else {
                    System.out.println("No optimal solution found.");

                    getSplit(instance, sols);
                }

                // Clean up
                model.dispose();
                env.dispose();
            }

        } catch (GRBException e) {
            System.out.println("Error code: " + e.getErrorCode() + ". " + e.getMessage());
        }
    }

    private void getSplit(StatementEntityInstance instance, ArrayList<Solution> sols) {
        GreedySplit splitInst = new GreedySplit(instance);
        ArrayList<StatementEntityInstance> split = splitInst.findSplit(5, 1.0 / 3);
        deletedNodes.addAll(splitInst.deletedEntities);

        for (StatementEntityInstance inst : split) {
            computeILPCoord(inst, sols);
        }
    }

    // test
    private static void testDatasets() {
        String[] datasets = { "structured_dataset", "small_world_4", "robbery" };

        for (String name : datasets) {
            String input = "data\\" + name + ".json";
            String output = "solutions\\" + name + "-test.txt";

            System.out.println("Running ILP on " + name + "...");
            StatementEntityInstance instance = new StatementEntityInstance(input);
            StatementEntitySolution solution = new StatementEntitySolution();
            solution.computeILPCoord(instance, new ArrayList<>());
            SolutionPositioner.computeCompleteSolution(solution.solutions, output);
            System.out.println("Wrote: " + output);
        }
    }

    public static void main(String[] args) {
        testDatasets();
    }
}