package ilp.solvers;

import java.util.List;

import com.gurobi.gurobi.*;

import ilp.ModelContext;
import ilp.constraints.*;
import ilp.objective.*;
import ilp.variables.VarsPolygons;
import ilp.variables.VarsRectangles;
import model.PolygonSolution;
import model.RectangleSolution;
import model.Solution;
import model.StatementEntityInstance;

public class StatementEntitySolver {

    private final int dimensions;
    private final int gridMin = 0;
    private final int maxSizeSum = 8;
    private final double wTopLeft = 0.5;
    private final double wMaxExtents = 2.0;
    private final int solutionType;

    // Build the constraint set once
    private final List<ConstraintModule> constraints;

    private final ObjectiveModule objective;

    // Constructor with default constraints and objective (produces rectangle
    // solutions)
    public StatementEntitySolver(int dimensions, int solutionType) {
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
        this.objective = new CompactSquareTopLeft();
        this.solutionType = solutionType;
    }

    // Constructor that allows you to define your own list of constraints and
    // objective function
    public StatementEntitySolver(int dimensions, List<ConstraintModule> constraints, ObjectiveModule objective,
            int solutionType) {
        this.dimensions = dimensions;
        this.constraints = constraints;
        this.objective = objective;
        this.solutionType = solutionType;
    }

    /**
     * Pure solve for a single instance.
     * 
     * @return Solution if optimal, else null (caller decides to split).
     */
    public Solution solve(StatementEntityInstance inst) throws Exception, GRBException {
        int maxCells = (dimensions + 1) * (dimensions + 1);
        if (inst.numberOfStatements > maxCells) {
            System.out.println("Instance too large");
            return null;
        }

        try (ModelContext ctx = new ModelContext(inst, dimensions, gridMin, maxSizeSum, wTopLeft, wMaxExtents,
                solutionType)) {
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
            switch (solutionType) {
                case 0:
                    return extractRectangleSolution(ctx);
                case 1:
                    return extractPolygonSolution(ctx);
                default:
                    throw new Exception("Unknown solution type");
            }
        }
    }

    private Solution extractRectangleSolution(ModelContext ctx) throws Exception, GRBException {
        if ((ctx.v instanceof VarsRectangles v)) { // only extracts rectangle solutions
            int nEntities = ctx.entityIds.size();
            int nStatements = ctx.statementIds.size();
            // Extract solution
            int w = (int) v.maxWidth.get(GRB.DoubleAttr.X);
            int h = (int) v.maxHeight.get(GRB.DoubleAttr.X);

            int[][] entityCoordinates = new int[nEntities][4];
            int[][] statementCoordinates = new int[nStatements][2];

            for (int i = 0; i < nEntities; i++) {
                entityCoordinates[i][0] = (int) v.entityCoordinates[i][0].get(GRB.DoubleAttr.X);
                entityCoordinates[i][1] = (int) v.entityCoordinates[i][1].get(GRB.DoubleAttr.X);
                entityCoordinates[i][2] = (int) v.entityCoordinates[i][2].get(GRB.DoubleAttr.X);
                entityCoordinates[i][3] = (int) v.entityCoordinates[i][3].get(GRB.DoubleAttr.X);
            }

            for (int i = 0; i < nStatements; i++) {
                statementCoordinates[i][0] = (int) v.statementCoordinates[i][0].get(GRB.DoubleAttr.X);
                statementCoordinates[i][1] = (int) v.statementCoordinates[i][1].get(GRB.DoubleAttr.X);
            }

            // Add solution to global list of solutions
            Solution newSolution = new RectangleSolution(ctx.inst, w, h, ctx.entityIds, entityCoordinates,
                    statementCoordinates);

            return newSolution;
        } else {
            throw new Exception("Incorrect solution type");
        }
    }

    private Solution extractPolygonSolution(ModelContext ctx) throws Exception, GRBException {
        if ((ctx.v instanceof VarsPolygons v)) { // only extracts rectangle solutions
            int nEntities = ctx.entityIds.size();
            int nStatements = ctx.statementIds.size();
            // Extract solution
            int w = (int) v.maxWidth.get(GRB.DoubleAttr.X);
            int h = (int) v.maxHeight.get(GRB.DoubleAttr.X);

            int[][] statementCoordinates = new int[nStatements][2];

            // For each entity i and each grid row j:
            // entities[i][j][0] = whether row is active (entity is on this row)
            // entities[i][j][1] = beginning of entity on this row (if active)
            // entities[i][j][2] = end of entity on this row (if active)
            int[][][] entities = new int[nEntities][dimensions + 1][3];

            for (int i = 0; i < nEntities; i++) {
                for (int j = 0; j <= dimensions; j++) {
                    entities[i][j][0] = (int) v.entities[i].activeRows[j].get(GRB.DoubleAttr.X);
                    entities[i][j][1] = (int) v.entities[i].rowBounds[j][0].get(GRB.DoubleAttr.X);
                    entities[i][j][2] = (int) v.entities[i].rowBounds[j][1].get(GRB.DoubleAttr.X);
                }
            }

            for (int i = 0; i < nStatements; i++) {
                statementCoordinates[i][0] = (int) v.statementCoordinates[i][0].get(GRB.DoubleAttr.X);
                statementCoordinates[i][1] = (int) v.statementCoordinates[i][1].get(GRB.DoubleAttr.X);
            }

            // Add solution to global list of solutions
            Solution newSolution = new PolygonSolution(ctx.inst, w, h, ctx.entityIds, entities, statementCoordinates);

            return newSolution;
        } else {
            throw new Exception("Incorrect solution type");
        }
    }
}