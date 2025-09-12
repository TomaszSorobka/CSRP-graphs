package ilp.solvers;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBEnv;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;
import com.gurobi.gurobi.GRBModel;
import com.gurobi.gurobi.GRBVar;

import ilp.ModelContext;
import ilp.constraints.C00NonNegativity;
import ilp.constraints.C01UpperBound;
import ilp.constraints.C1StatementsDistinctCoordinates;
import ilp.constraints.C2SingleCellEntities;
import ilp.constraints.ConstraintModule;
import ilp.constraints.H10Squareness;
import ilp.constraints.H1StatementsInsideEntities;
import ilp.constraints.H2OutsideNonMembers;
import ilp.constraints.H6DisjointEntitiesDoNotOverlap;
import ilp.constraints.H8MaxWidth;
import ilp.constraints.H9MaxHeight;
import ilp.objective.CompactSquareTopLeft;
import ilp.objective.ObjectiveModule;
import io.SolutionWriter;
import model.PositionedSolution;
import model.Solution;
import model.StatementEntityInstance;
import split.GreedySplit;

public class StatementEntitySolution {
    ArrayList<Solution> solutions = new ArrayList<>();
    HashSet<Integer> deletedNodes = new HashSet<>();
    HashMap<Integer, int[]> deletedPositions = new HashMap<>();
    ArrayList<Integer> pastAlignments = new ArrayList<>();
    final int dimensions = 4;
    final int M = dimensions + 1; // grid is [0..dimensions]
    // Keep the original bounds for now (0..20) to avoid any behavior change
    final int COORD_LB = 0;
    final int COORD_UB = 20; // TODO: later we can switch this to 'dimensions', and remove the constraints
                             // C00 and C01?

    // Method to compute the best solution with ILP
    public void computeILPCoord(StatementEntityInstance instance, ArrayList<Solution> sols) throws GRBException {
        // Setup
        final int nEntities = instance.numberOfEntities;
        final int nStatements = instance.numberOfStatements;
        ArrayList<Integer> entityIds = new ArrayList<>(instance.entities.keySet());
        ArrayList<Integer> statementIds = new ArrayList<>(instance.statements.keySet());

        int w;
        int h;
        int[][] entityCoordinates = new int[entityIds.size()][4];
        int[][] statementCoordinates = new int[statementIds.size()][2];

        // Build fast lookup maps
        Map<Integer, Integer> entityIdToIdx = new HashMap<>();
        for (int i = 0; i < entityIds.size(); i++) {
            entityIdToIdx.put(entityIds.get(i), i);
        }

        Map<Integer, Integer> statementIdToIdx = new HashMap<>();
        for (int i = 0; i < statementIds.size(); i++) {
            statementIdToIdx.put(statementIds.get(i), i);
        }

        GRBEnv env = null;
        GRBModel model = null;

        // If instance has more statements than could fit in the grid, split immediately
        if (nStatements > (Math.pow(dimensions + 1, 2))) {
            System.out.println("Instance too large.");

            getSplit(instance, sols);
            return;
        }

        try (ModelContext ctx = new ModelContext(instance, dimensions, 0, 8, 0.5, 2)) {
            // ---- 1) Add your constraint modules here ----
            // Include exactly the modules you've implemented so far.
            // (Order should match your original constraint order if any dependencies
            // exist.)
            java.util.List<ConstraintModule> modules = java.util.List.of(
                    new C00NonNegativity(),
                    new C01UpperBound(),
                    new H1StatementsInsideEntities(),
                    new H2OutsideNonMembers(),
                    new H6DisjointEntitiesDoNotOverlap(),
                    new C1StatementsDistinctCoordinates(),
                    new C2SingleCellEntities(),
                    new H8MaxWidth(),
                    new H9MaxHeight(),
                    new H10Squareness());

            for (ConstraintModule m : modules) {
                m.add(ctx);
            }

            ObjectiveModule objective = new CompactSquareTopLeft();
            objective.apply(ctx);
            ctx.model.optimize();

            // Check if the optimization was interrupted or completed successfully
            int status = ctx.model.get(GRB.IntAttr.Status);

            // Check if a solution was found
            if (status == GRB.Status.OPTIMAL) {

                Solution newSolution = extractSolution(ctx, instance, entityIds, statementIds, entityIdToIdx);
                // Add component to class' solution list
                solutions.add(newSolution);
            } else {
                System.out.println("No optimal solution found.");

                getSplit(instance, sols);
            }

        } catch (GRBException e) {
            System.out.println("Error code: " + e.getErrorCode() + ". " + e.getMessage());
        } finally {
            if (model != null)
                model.dispose();
            if (env != null)
                env.dispose();
        }
    }

    private void getSplit(StatementEntityInstance instance, ArrayList<Solution> sols) throws GRBException {
        GreedySplit splitInst = new GreedySplit(instance);
        ArrayList<StatementEntityInstance> split = splitInst.findSplit(5, 1.0 / 3);
        deletedNodes.addAll(splitInst.deletedEntities);

        for (StatementEntityInstance inst : split) {
            computeILPCoord(inst, sols);
        }
    }

    private Solution extractSolution(ModelContext ctx,
            StatementEntityInstance instance,
            ArrayList<Integer> entityIds,
            List<Integer> statementIds,
            Map<Integer, Integer> entityIdToIdx) throws GRBException {

        int nEntities = entityIds.size();
        int nStatements = statementIds.size();
        // Extract solution
        int w = (int) ctx.v.maxWidth.get(GRB.DoubleAttr.X);
        int h = (int) ctx.v.maxHeight.get(GRB.DoubleAttr.X);

        int[][] entityCoordinates = new int[nEntities][4];
        int[][] statementCoordinates = new int[nStatements][2];

        for (int i = 0; i < nEntities; i++) {
            entityCoordinates[i][0] = (int) ctx.v.entityCoordinates[i][0].get(GRB.DoubleAttr.X);
            entityCoordinates[i][1] = (int) ctx.v.entityCoordinates[i][1].get(GRB.DoubleAttr.X);
            entityCoordinates[i][2] = (int) ctx.v.entityCoordinates[i][2].get(GRB.DoubleAttr.X);
            entityCoordinates[i][3] = (int) ctx.v.entityCoordinates[i][3].get(GRB.DoubleAttr.X);
        }

        for (int i = 0; i < nStatements; i++) {
            statementCoordinates[i][0] = (int) ctx.v.statementCoordinates[i][0].get(GRB.DoubleAttr.X);
            statementCoordinates[i][1] = (int) ctx.v.statementCoordinates[i][1].get(GRB.DoubleAttr.X);
        }

        // Add solution to global list of solutions
        Solution newSolution = new Solution(instance, w, h, entityIds, entityCoordinates, statementCoordinates);

        return newSolution;
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

            try {
                solution.computeILPCoord(instance, new ArrayList<>());
            } catch (GRBException e) {
                e.printStackTrace();
            }

            PositionedSolution finalLayout = SolutionPositioner.computeCompleteSolution(solution.solutions);

            // Write result to file
            SolutionWriter.saveMultipleToFile(
                    finalLayout.solutions,
                    finalLayout.width,
                    finalLayout.height,
                    "solutions/final-output.txt");

            System.out.println("Wrote: " + output);
        }
    }

    public static void main(String[] args) {
        testDatasets();
    }
}