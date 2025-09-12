import java.io.IOException;
import java.util.*;
import com.gurobi.gurobi.GRBException;

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
    private final int splitK; // e.g., 5
    private final double splitRatio; // e.g., 1.0/3

    public final List<Solution> solutions = new ArrayList<>();
    public final Set<Integer> deletedNodes = new HashSet<>();
    public final Map<Integer, int[]> deletedPositions = new HashMap<>(); // fill later if needed

    public Orchestrator(StatementEntitySolver solver, int splitK, double splitRatio) {
        this.solver = solver;
        this.splitK = splitK;
        this.splitRatio = splitRatio;
    }

    public List<Solution> solveWithSplits(StatementEntityInstance root) throws GRBException {
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
        // Somewhere in your app:
        int dimensions = 4;
        StatementEntitySolver solver = new StatementEntitySolver(dimensions);
        Orchestrator orchestrator = new Orchestrator(solver, 5, 1.0 / 3);

        try {
            StatementEntityInstance instance = StatementEntityReader.readFromFile("data/small_world_4.json");
            List<Solution> sols;
            sols = orchestrator.solveWithSplits(instance);
            PositionedSolution finalLayout = SolutionPositioner.computeCompleteSolution((ArrayList<Solution>) sols);

            // Write result to file
            SolutionWriter.saveMultipleToFile(
                    finalLayout.solutions,
                    finalLayout.width,
                    finalLayout.height,
                    "solutions/small_world_test.txt");

        } catch (GRBException | IOException e) {
            e.printStackTrace();
        }

    }
}