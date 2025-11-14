import java.util.*;
import com.gurobi.gurobi.GRBException;

import ilp.constraints.C1StatementsDistinctCoordinates;
import ilp.constraints.ConstraintModule;
import ilp.constraints.P00DefineRowSpans;
import ilp.constraints.P0ValidEntityRowBounds;
import ilp.constraints.P10StatementIsOnRowBooleans;
import ilp.constraints.P11EqualRowStart;
import ilp.constraints.P12aRowEndMonotonicity;
import ilp.constraints.P12bRowStartMonotonicity;
import ilp.constraints.P13aNestedRowBoundsNonIncreasing;
import ilp.constraints.P14MonotoneRowSpan;
import ilp.constraints.P1ConsecutiveEntityRows;
import ilp.constraints.P2ConnectedEntityRows;
import ilp.constraints.P3VerticalConvexity;
import ilp.constraints.P4StatementsInsideEntities;
import ilp.constraints.P5OutsideNonMembers;
import ilp.constraints.P6DisjointEntitiesDoNotOverlap;
import ilp.constraints.P7SingleCellEntities;
import ilp.constraints.P8MaxWidth;
import ilp.constraints.P9MaxHeight;
import ilp.objective.ObjectiveModule;
import ilp.objective.PolygonAreaDimensionsComplexity;
import ilp.solvers.SolutionPositioner;
import ilp.solvers.StatementEntitySolver;
import io.SolutionWriter;
import io.StatementEntityReader;
import model.PositionedSolution;
import model.Solution;
import model.StatementEntityInstance;
import split.GreedySplit;

public class Orchestrator {

    private final StatementEntitySolver solver;
    private final int splitK; // Maximum number of nodes to be deleted (usually 5)
    private final double splitRatio; // Coefficient that determines how wide is the range of acceptable components'
                                     // sizes produced from the split

    public final List<Solution> solutions = new ArrayList<>();
    public final Set<Integer> deletedNodes = new HashSet<>();
    public final Map<Integer, int[]> deletedPositions = new HashMap<>(); // fill later if needed

    public Orchestrator(StatementEntitySolver solver, int splitK, double splitRatio) {
        this.solver = solver;
        this.splitK = splitK;
        this.splitRatio = splitRatio;
    }

    public List<Solution> solveWithSplits(StatementEntityInstance root) throws Exception, GRBException {
        Deque<StatementEntityInstance> queue = new ArrayDeque<>();
        queue.add(root);

        while (!queue.isEmpty()) {
            StatementEntityInstance inst = queue.removeFirst();
            Solution sol = solver.solve(inst);
            if (sol != null) {
                solutions.add(sol);
                continue;
            }

            // Too large or no optimal -> split
            GreedySplit splitInst = new GreedySplit(inst);
            ArrayList<StatementEntityInstance> parts = splitInst.findSplit(splitK, splitRatio);
            // Record deletions
            deletedNodes.addAll(splitInst.deletedEntities);

            // Enqueue parts
            queue.addAll(parts);
        }

        return solutions;
    }

    public static void main(String[] args) {
        // Solution parameters
        int dimensions = 4;

        List<ConstraintModule> constraints = List.of(
                new P0ValidEntityRowBounds(),
                new P00DefineRowSpans(),
                new P1ConsecutiveEntityRows(),
                new P2ConnectedEntityRows(),
                new P3VerticalConvexity(),
                new P4StatementsInsideEntities(),
                new P5OutsideNonMembers(),
                new P6DisjointEntitiesDoNotOverlap(),
                new P7SingleCellEntities(),
                new P8MaxWidth(),
                new P9MaxHeight(),
                new P10StatementIsOnRowBooleans(),
                // new P11EqualRowStart(),
                // new P12aRowEndMonotonicity(),
                // new P12bRowStartMonotonicity(),
                // new P13aNestedRowBoundsNonIncreasing(),
                new P14MonotoneRowSpan(1.0), // use a double parameter: 1.0 for non-decreasing row span, 0.0 for non-increasing row span
                new C1StatementsDistinctCoordinates());

        ObjectiveModule objective = new PolygonAreaDimensionsComplexity();

        StatementEntitySolver solver = new StatementEntitySolver(dimensions, constraints, objective, 1);
        Orchestrator orchestrator = new Orchestrator(solver, 5, 1.0 / 3);
        String inputFolder = "data/";
        String outputFolder = "solutions/";
        ArrayList<String> instances = new ArrayList<String>(List.of("balloon_boy_small"));

        for (String inst : instances) {
            try {
                StatementEntityInstance instance = StatementEntityReader.readFromFile(inputFolder + inst + ".json");
                List<Solution> sols;
                sols = orchestrator.solveWithSplits(instance);
                PositionedSolution finalLayout = SolutionPositioner.computeCompleteSolution((ArrayList<Solution>) sols);

                // Write result to file
                SolutionWriter.saveMultipleToFile(
                        finalLayout.solutions,
                        finalLayout.width,
                        finalLayout.height,
                        outputFolder + inst + "_poly_test.txt");

            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}