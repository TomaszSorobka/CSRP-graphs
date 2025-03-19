import java.util.ArrayList;
public class GreedySplit {
    StatementEntityInstance instance;
    int nEntities;
    int nStatements;

    public GreedySplit(StatementEntityInstance instance) {
        this.instance = instance;
        nEntities = instance.numberOfEntities;
        nStatements = instance.numberOfStatements;
    }

    // Try all possible splits by deleting up to s nodes and return a set of instances for the one with minimal cost
    public ArrayList<StatementEntityInstance> findSplit(int s, double alpha) {
        // Make an intersection graph for the parent instance
        IntersectionGraph graph = new IntersectionGraph(instance);
        int n = graph.intersectionGraph.length;

        // Store the best split so far
        double bestCost = Double.MAX_VALUE;
        IntersectionGraph bestSplit = graph;

        // Get all possible combinations of deleted nodes
        ArrayList<ArrayList<Integer>> combinations = generateCombinations(n, s);

        // For each combination make the split and evaluate its cost
        for (ArrayList<Integer> combination : combinations) {
            // Make a new graph
            IntersectionGraph split = new IntersectionGraph(instance);

            // Make the split
            split.split(combination);
            split.merge(alpha);
            split.addDeletedNodes();

            // Evaluate the cost of the split
            double cost = cost(split, alpha);

            // Store the split with minimal cost
            if (cost < bestCost) {
                bestCost = cost;
                bestSplit = split;
            }
        }

        // System.out.println("#components " + bestSplit.components.size());
        // for (ArrayList<Node> component : bestSplit.components) {
        //     System.out.println(component.size());
        // }

        // System.out.println();

        StatementEntityInstance inst = new SplitIntanceFactory(instance, bestSplit).createInstances().get(0);
        for (int ent : inst.entityIndToStatements.keySet()) {
            int[] arr = inst.entityIndToStatements.get(ent);
            System.out.println(inst.entities.get(ent));
            for (int i = 0; i < arr.length; i++) {
                System.out.print(" " + arr[i]);
            }
            System.out.println();
        }

        // Return a set of instances for the components of the best split
        return new SplitIntanceFactory(instance, bestSplit).createInstances(); 
    }

    public static ArrayList<ArrayList<Integer>> generateCombinations(int n, int s) {
        ArrayList<ArrayList<Integer>> result = new ArrayList<>();
        for (int size = 1; size <= s; size++) {
            backtrack(n, size, 0, new ArrayList<>(), result);
        }
        return result;
    }

    private static void backtrack(int n, int size, int start, ArrayList<Integer> current, ArrayList<ArrayList<Integer>> result) {
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

    private double cost(IntersectionGraph graph, double alpha) {
        // Do not consider "splits" that do not actually split the graph
        // TODO should it instead be compared to the number of components in the parent instance graph in case that one is already disconnected?
        if (graph.components.size() == 1) return Double.MAX_VALUE;

        double cost = 0;
        cost += (3 * graph.components.size());
        cost += graph.deletedNodes.size();

        int w = 5;
        int maxAllowed = (int) Math.floor((1 - alpha) * graph.intersectionGraph.length);

        for (ArrayList<Node> component : graph.components) {
            if (component.size() > maxAllowed) cost += w;
        }

        return cost;
    }
}