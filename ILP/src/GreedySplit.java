import java.util.ArrayList;
import java.util.HashSet;

public class GreedySplit {
    StatementEntityInstance instance;
    int nEntities;
    int nStatements;
    ArrayList<Integer> deletedEntities;

    public GreedySplit(StatementEntityInstance instance) {
        this.instance = instance;
        this.nEntities = instance.numberOfEntities;
        this.nStatements = instance.numberOfStatements;
        this.deletedEntities = new ArrayList<>();
    }

    // Try all possible splits by deleting up to s nodes and return a set of
    // instances for the one with minimal cost
    public ArrayList<StatementEntityInstance> findSplit(int s, double alpha) {
        // Make an intersection graph for the parent instance
        IntersectionGraph graph = new IntersectionGraph(instance);
        int n = graph.intersectionGraph.length;

        // Store the best split so far
        double bestCost = Double.MAX_VALUE;
        IntersectionGraph bestSplit = graph;

        // Get all possible combinations of deleted nodes
        ArrayList<ArrayList<Integer>> combinations = generateCombinations(n,
                Math.min(s, instance.numberOfEntities - 1));

        // For each combination make the split and evaluate its cost
        for (ArrayList<Integer> combination : combinations) {
            // Make a new graph
            IntersectionGraph split = new IntersectionGraph(instance);
            int initSize = split.components.size();

            // Make the split
            split.split(combination);

            split.merge(alpha);

            split.addDeletedNodes();

            ArrayList<StatementEntityInstance> instances = new SplitIntanceFactory(instance, bestSplit)
                    .createInstances();

            // Evaluate the cost of the split
            double cost = cost(instances, split, alpha, initSize);

            // Store the split with minimal cost
            if (cost < bestCost) {
                bestCost = cost;
                bestSplit = split;
            }
        }

        getDeletedEntities(bestSplit);
        // Return a set of instances for the components of the best split
        return new SplitIntanceFactory(instance, bestSplit).createInstances();
    }

    // Create an array list containing the indices of the deleted nodes from this
    // split
    private void getDeletedEntities(IntersectionGraph graph) {
        for (Node deletedNode : graph.deletedNodes) {
            deletedEntities.add(deletedNode.id);
        }
    }

    public static ArrayList<ArrayList<Integer>> generateCombinations(int n, int s) {
        ArrayList<ArrayList<Integer>> result = new ArrayList<>();
        for (int size = 1; size <= s; size++) {
            backtrack(n, size, 0, new ArrayList<>(), result);
        }
        return result;
    }

    private static void backtrack(int n, int size, int start, ArrayList<Integer> current,
            ArrayList<ArrayList<Integer>> result) {
        if (current.size() == size) {
            result.add(new ArrayList<>(current));
            return;
        }

        for (int i = start; i < n; i++) {
            current.add(i);
            backtrack(n, size, i + 1, current, result);
            current.remove(current.size() - 1);
        }
    }

    private double cost(ArrayList<StatementEntityInstance> insts, IntersectionGraph graph, double alpha, int initSize) {
        // Do not consider "splits" that do not actually split the graph
        // TODO should it instead be compared to the number of components in the parent
        // instance graph in case that one is already disconnected?
        if (graph.components.size() == 1)
            return Double.MAX_VALUE;

        double cost = 0;
        cost += graph.components.size();
        cost += graph.deletedNodes.size();
        cost += graph.deletedNodeCopies.size();

        int w = 10;
        int maxAllowed = (int) Math.floor((1 - alpha) * graph.intersectionGraph.length);

        for (ArrayList<Node> component : graph.components) {
            if (component.size() > maxAllowed)
                cost += w;
        }

        // Add the statements that repeat in an instance to the cost? 
        for (StatementEntityInstance inst : insts) {
            HashSet<Integer> statements = new HashSet<>();
            int nrRepetitions = 0;
            for (Integer ent : inst.entityIndToStatements.keySet()) {
                for (int i = 0; i < inst.entityIndToStatements.get(ent).length; i++) {
                    if (statements.contains(inst.entityIndToStatements.get(ent)[i]))
                        nrRepetitions++;
                    statements.add(inst.entityIndToStatements.get(ent)[i]);
                }
                statements.clear();
            }

            cost += 20*(nrRepetitions/inst.numberOfStatements);
        }

        return cost;
    }
}