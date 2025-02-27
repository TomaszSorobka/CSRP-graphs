import java.util.Arrays;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBEnv;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;
import com.gurobi.gurobi.GRBQuadExpr;
import com.gurobi.gurobi.GRBModel;
import com.gurobi.gurobi.GRBVar;

public class StatementEntitySolution {

    StatementEntityInstance instance;
    // Solution representation - coordinate of top left corner and bottom right corner of each entity
    // entity 0 has coordinates entityCoordinates[0] = {xt, yt, xb, yb}
    int[][] entityCoordinates;
    // same for statements
    int[][] statementCoordinates;

    // Total dimensions of the solution
    int w;
    int h;

    // shorthand for the number of entities and statements
    int nEntities;
    int nStatements;

    // cost of the solution
    double cost; 

    // dimensions of the entities and statements, statementDimensions[i] = {width, height}
    double[] statementDimensions;
    // double margin;

    public StatementEntitySolution(StatementEntityInstance instance) {
        this.instance = instance;
        nEntities = instance.numberOfEntities;
        nStatements = instance.numberOfStatements;
        entityCoordinates = new int[nEntities][4];
        statementCoordinates = new int[nStatements][2];
        statementDimensions = new double[2];   // width, height
        // margin = 0.1;  // margin for placing statements inside entities
    }

    // Method to make a copy of the solution
    public StatementEntitySolution copy() {
        StatementEntitySolution copy = new StatementEntitySolution(instance);

        for (int i = 0; i < nEntities; i++) {
            copy.entityCoordinates[i][0] = entityCoordinates[i][0];
            copy.entityCoordinates[i][1] = entityCoordinates[i][1];
            copy.entityCoordinates[i][2] = entityCoordinates[i][2];
            copy.entityCoordinates[i][3] = entityCoordinates[i][3];
        }

        for (int i = 0; i < nStatements; i++) {
            copy.statementCoordinates[i][0] = statementCoordinates[i][0];
            copy.statementCoordinates[i][1] = statementCoordinates[i][1];
        }

        copy.statementDimensions[0] = statementDimensions[0];
        copy.statementDimensions[1] = statementDimensions[1];
        copy.cost = cost;
        return copy;
    }

    // Method to compute the best solution with ILP
    public void computeILPCoord() {
        try {
            GRBEnv env = new GRBEnv();
            GRBModel model = new GRBModel(env);

            // Create variables
            GRBVar[][] grbStatementCoord = new GRBVar[nStatements][2];
            GRBVar[][] grbEntityCoord = new GRBVar[nEntities][4];

            for (int i = 0; i < nStatements; i++) {
                grbStatementCoord[i][0] = model.addVar(0, 20, 0.0, GRB.INTEGER, "s" + i + "_" +  "x");
                grbStatementCoord[i][1] = model.addVar(0, 20, 0.0, GRB.INTEGER, "s" + i + "_" +  "y");
                
            }

            for (int i = 0; i < nEntities; i++) {
                for (int j = 0; j < 4; j++) {
                    grbEntityCoord[i][j] = model.addVar(0, 20, 0.0, GRB.INTEGER, "e" + i + "_" + (j % 2 == 0 ? "x" : "y") + (j / 2 == 0 ? "_t" : "_b"));
                }
            }

            // Constraints

            // // Statement size is fixed (H0)
            // for (int i = 0; i < nStatements; i++) {
            //     GRBLinExpr expr = new GRBLinExpr();
            //     expr.addTerm(1.0, grbStatementCoord[i][2]);
            //     expr.addTerm(-1.0, grbStatementCoord[i][0]);
            //     model.addConstr(expr, GRB.EQUAL, statementDimensions[0], "H0w_" + i);

            //     expr = new GRBLinExpr();
            //     expr.addTerm(1.0, grbStatementCoord[i][3]);
            //     expr.addTerm(-1.0, grbStatementCoord[i][1]);
            //     model.addConstr(expr, GRB.EQUAL, statementDimensions[1], "H0h_" + i);
            // }

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

            // All coordinates are at most 6/ Restrict solution size (H00)
            for (int i = 0; i < nStatements; i++) {
                model.addConstr(grbStatementCoord[i][0], GRB.LESS_EQUAL, 4, "H00_" + i + "_x");
                model.addConstr(grbStatementCoord[i][1], GRB.LESS_EQUAL, 4, "H00_" + i + "_y");
            }
            for (int i = 0; i < nEntities; i++) {
                for (int j = 0; j < 4; j++) {
                    model.addConstr(grbEntityCoord[i][j], GRB.LESS_EQUAL, 4, "H00_e_" + i + "_" + j);
                }
            }

            // Positioning statements inside entities (H1)
            for(int i = 0; i < nEntities; i++) {
                int[] statementsOfEntity = instance.entityIndToStatements.get(i);
                for (int j = 0; j < statementsOfEntity.length; j++) {
                    int statementIndex = statementsOfEntity[j];
                    
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
                    final int statementIndexFinal = j;
                    if (Arrays.stream(instance.entityIndToStatements.get(i)).noneMatch(x -> x == statementIndexFinal)) {
                    
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
                    int[] statementsOfEntity1 = instance.entityIndToStatements.get(i);
                    int[] statementsOfEntity2 = instance.entityIndToStatements.get(j);
                    boolean overlap = false;
                    for (int k = 0; k < statementsOfEntity1.length; k++) {
                        for (int l = 0; l < statementsOfEntity2.length; l++) {
                            if (statementsOfEntity1[k] == statementsOfEntity2[l]) {
                                overlap = true;
                                break;
                            }
                        }
                    }

                    if(!overlap) {

                        GRBVar[] vars = new GRBVar[4];
                        for (int k = 0; k < 4; k++) {
                            vars[k] = model.addVar(0.0, 1.0, 0.0, GRB.BINARY, "H6_" + i + "_" + j + "_" + k);
                        } 

                        // x1_e1 - x2_e2 + M * vars[0] >= 0
                        GRBLinExpr expr = new GRBLinExpr();
                        expr.addTerm(-1.0, grbEntityCoord[j][2]);
                        expr.addTerm(1.0, grbEntityCoord[i][0]);
                        expr.addTerm(Integer.MAX_VALUE, vars[0]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_left");

                        // x2_e1 - x1_e2 + M * vars[1] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbEntityCoord[j][0]);
                        expr.addTerm(-1.0, grbEntityCoord[i][2]);
                        expr.addTerm(Integer.MAX_VALUE, vars[1]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_right");

                        // y1_e1 - y2_e2 + M * vars[2] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(-1.0, grbEntityCoord[j][3]);
                        expr.addTerm(1.0, grbEntityCoord[i][1]);
                        expr.addTerm(Integer.MAX_VALUE, vars[2]);
                        model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H6_" + i + "_" + j + "_top");

                        // y1_e2 - y2_e1 + M * vars[3] >= 0
                        expr = new GRBLinExpr();
                        expr.addTerm(1.0, grbEntityCoord[j][1]);
                        expr.addTerm(-1.0, grbEntityCoord[i][3]);
                        expr.addTerm(Integer.MAX_VALUE, vars[3]);
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
                    expr.addTerm(Integer.MAX_VALUE, vars[0]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H7_" + i + "_" + j + "_x1");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][0]);
                    expr.addTerm(-1.0, grbStatementCoord[j][0]);
                    expr.addTerm(-Integer.MAX_VALUE, vars[1]);
                    model.addConstr(expr, GRB.LESS_EQUAL, -1, "H7_" + i + "_" + j + "_x2");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][1]);
                    expr.addTerm(-1.0, grbStatementCoord[j][1]);
                    expr.addTerm(Integer.MAX_VALUE, vars[2]);
                    model.addConstr(expr, GRB.GREATER_EQUAL, 1, "H7_" + i + "_" + j + "_y1");

                    expr = new GRBLinExpr();
                    expr.addTerm(1.0, grbStatementCoord[i][1]);
                    expr.addTerm(-1.0, grbStatementCoord[j][1]);
                    expr.addTerm(-Integer.MAX_VALUE, vars[3]);
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
                if (instance.entityIndToStatements.get(i).length == 1) {
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

            for(int i = 0; i < nEntities; i++) {
                GRBLinExpr expr = new GRBLinExpr();
                expr.addTerm(1.0, maxWidth);
                expr.addTerm(-1.0, grbEntityCoord[i][2]);
                model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H8_" + i + "_w");
            
            }

            // Max height constraint (H9)
            GRBVar maxHeight = model.addVar(0.0, Integer.MAX_VALUE, 0.0, GRB.INTEGER, "maxHeight");

            for(int i = 0; i < nEntities; i++) {
                GRBLinExpr expr = new GRBLinExpr();
                expr.addTerm(1.0, maxHeight);
                expr.addTerm(-1.0, grbEntityCoord[i][3]);
                model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H9_" + i + "_h"); 
            }
                
            // Ensure squareness, difference between max width and max height is minimized (H10)
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
            MINIMIZE_ME.addTerm(1.0, maxHeight);
            MINIMIZE_ME.addTerm(1.0, maxWidth);

            for (int i = 0; i < nEntities; i++) {
                // MINIMIZE_ME.addTerm(1.0, grbEntityCoord[i][2], grbEntityCoord[i][3]);
                // MINIMIZE_ME.addTerm(-1.0, grbEntityCoord[i][0], grbEntityCoord[i][3]);
                // MINIMIZE_ME.addTerm(-1.0, grbEntityCoord[i][2], grbEntityCoord[i][1]);
                // MINIMIZE_ME.addTerm(1.0, grbEntityCoord[i][0], grbEntityCoord[i][1]);

                MINIMIZE_ME.addTerm(1.0, grbEntityCoord[i][2]);
                MINIMIZE_ME.addTerm(-1.0, grbEntityCoord[i][0]);
                MINIMIZE_ME.addTerm(-1.0, grbEntityCoord[i][1]);
                MINIMIZE_ME.addTerm(1.0, grbEntityCoord[i][3]);
            }

            // Favor top left
            for (int i = 0; i < nStatements; i++) {
                MINIMIZE_ME.addTerm(1.0, grbStatementCoord[i][0]);
                MINIMIZE_ME.addTerm(1.0, grbStatementCoord[i][1]);
            }

            model.setObjective(MINIMIZE_ME, GRB.MINIMIZE);

            // Set the time limit for the optimization (in seconds)
            // model.set(GRB.DoubleParam.TimeLimit, 4000.0);

            model.optimize();

            // Check if the optimization was interrupted or completed successfully
            int status = model.get(GRB.IntAttr.Status);

            // Check if the optimization was interrupted or completed
            if (status == GRB.Status.OPTIMAL || status == GRB.Status.TIME_LIMIT) {
                // Best solution found
                // System.out.println("Best solution found: " + model.getObjective().getValue());
                w = (int) maxWidth.get(GRB.DoubleAttr.X);
                h = (int) maxHeight.get(GRB.DoubleAttr.X);
                
                // Extract solution
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
            } else {
                System.out.println("No optimal solution found.");
            }
            
            // Clean up
            model.dispose();
            env.dispose();

        } catch (GRBException e) {
            System.out.println("Error code: " + e.getErrorCode() + ". " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        String jsonFilePath = "ILP\\data\\structured_dataset_repeat.json";
        StatementEntityInstance instance = new StatementEntityInstance(jsonFilePath);
        StatementEntitySolution solution = new StatementEntitySolution(instance);
        solution.computeILPCoord();
        System.out.println("Solution:");
        System.out.println("w: " + solution.w);
        System.out.println("h: " + solution.h);
        for (int i = 0; i < solution.nEntities; i++) {
            System.out.println("Entity " + instance.entities[i] + ": (" + solution.entityCoordinates[i][0] + ", " + solution.entityCoordinates[i][1] + ") - (" + solution.entityCoordinates[i][2] + ", " + solution.entityCoordinates[i][3] + ")");
        }
        for (int i = 0; i < solution.nStatements; i++) {
            System.out.println("Statement " + instance.statements[i] + ": (" + solution.statementCoordinates[i][0] + ", " + solution.statementCoordinates[i][1] + ")");
        }
    }
}
