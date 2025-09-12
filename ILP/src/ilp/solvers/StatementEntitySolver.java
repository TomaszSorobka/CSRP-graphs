package ilp.solvers;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.gurobi.gurobi.*;

import ilp.ModelContext;
import ilp.constraints.*;
import ilp.objective.*;
import model.Solution;
import model.StatementEntityInstance;

public class StatementEntitySolver {

    private final int dimensions;
    private final int gridMin = 0;
    private final int maxSizeSum = 8;
    private final double wTopLeft = 0.5;
    private final double wMaxExtents = 2.0;

    // Build the constraint set once
    private final List<ConstraintModule> constraints;

    private final ObjectiveModule objective = new CompactSquareTopLeft();

    public StatementEntitySolver(int dimensions) {
        this.dimensions = dimensions;
        this.constraints = List.of(
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
    }

        public StatementEntitySolver(int dimensions, List<ConstraintModule> constraints) {
        this.dimensions = dimensions;
        this.constraints = constraints;
    }

    /**
     * Pure solve for a single instance.
     * 
     * @return Solution if optimal, else null (caller decides to split).
     */
    public Solution solve(StatementEntityInstance inst) throws GRBException {
        int maxCells = (dimensions + 1) * (dimensions + 1);
        if (inst.numberOfStatements > maxCells) {
            System.out.println("Instance too large");
            return null;
        }

        try (ModelContext ctx = new ModelContext(inst, dimensions, gridMin, maxSizeSum, wTopLeft, wMaxExtents)) {
            // Add constraints
            for (ConstraintModule c : constraints)
                c.add(ctx);

            // Objective
            objective.apply(ctx);

            // Solve
            ctx.model.optimize();
            int status = ctx.model.get(GRB.IntAttr.Status);
            if (status != GRB.Status.OPTIMAL) {
                return null;
            }

            // Extract and return
            return extractSolution(ctx);
        }
    }

    private Solution extractSolution(ModelContext ctx) throws GRBException {

        int nEntities = ctx.entityIds.size();
        int nStatements = ctx.statementIds.size();
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
        Solution newSolution = new Solution(ctx.inst, w, h, ctx.entityIds, entityCoordinates, statementCoordinates);

        return newSolution;
    }
}