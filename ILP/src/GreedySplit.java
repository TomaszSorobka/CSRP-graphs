import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

class Node {
    ArrayList<Edge> adj = new ArrayList<>();
    int id;
    int comp = -1;
    boolean deleted = false;
    boolean visited = false;
    HashSet<Integer> uniqueStatements = new HashSet<>();

    Node(int id) {
        this.id = id;
    }

    public Node copy() {
        Node copy = new Node(id);
        copy.comp = this.comp;
        copy.deleted = this.deleted;
        copy.visited = this.visited;
        copy.uniqueStatements = this.uniqueStatements; // same for all copies

        return copy;
    }
}

class Edge {
    // int from;
    int target;
    ArrayList<Integer> statements;

    Edge(int target) {
        this.statements = new ArrayList<>();
        this.target = target;
    }
}

public class GreedySplit {
    StatementEntityInstance instance;
    int nEntities;
    int nStatements;

    Node[] intersectionGraph;
    ArrayList<ArrayList<Node>> components = new ArrayList<>();
    int maxComponent = 0;
    ArrayList<Node> deletedNodes = new ArrayList<>();

    public GreedySplit(StatementEntityInstance instance) {
        this.instance = instance;
        nEntities = instance.numberOfEntities;
        nStatements = instance.numberOfStatements;

        intersectionGraph = new Node[nEntities];
    }

    private void initEdge(int entity1, int entity2) {
        boolean edgeExists = false;
        for (Edge e : intersectionGraph[entity1].adj) {
            if (e.target == entity2) {
                edgeExists = true;
            }
        }
        if (!edgeExists) {
            intersectionGraph[entity1].adj.add(new Edge(entity2));
            intersectionGraph[entity2].adj.add(new Edge(entity1));
        }
    }

    private void addStatement(int entity1, int entity2, int stInd) {
        for (Edge e : intersectionGraph[entity1].adj) {
            if (e.target == entity2) {
                e.statements.add(instance.entityIndToStatements.get(entity1)[stInd]);
            }
        }

        for (Edge e : intersectionGraph[entity2].adj) {
            if (e.target == entity1) {
                e.statements.add(instance.entityIndToStatements.get(entity1)[stInd]);
            }
        }
    }

    public void createEdge(int entity1, int entity2) {
        // Go through both statement lists
        for (int k = 0; k < instance.entityIndToStatements.get(entity1).length; k++) {
            for (int l = 0; l < instance.entityIndToStatements.get(entity2).length; l++) {
                // They share some statement
                if (instance.entityIndToStatements.get(entity1)[k] == instance.entityIndToStatements.get(entity2)[l]) {
                    initEdge(entity1, entity2);
                    addStatement(entity1, entity2, k);
                }
            }
        }
    }

    private void createGraph() {
        for (int i = 0; i < nEntities; i++) {
            intersectionGraph[i] = new Node(i);
        }

        // Create edges
        for (int i = 0; i < nEntities; i++) {
            for (int j = i + 1; j < nEntities; j++) {
                createEdge(i, j);
            }
        }

        // Initialize components
        ArrayList<Node> component = new ArrayList<>();

        for (int i = 0; i < nEntities; i++) {
            component.add(intersectionGraph[i]);
        }

        components.add(component);
    }

    private int deleteLargestNode() {
        int largest = findLargestNode();

        // Delete node
        deletedNodes.add(intersectionGraph[largest]);
        intersectionGraph[largest].deleted = true;

        // Remove node from all non deleted adjacency lists
        for (int i = 0; i < intersectionGraph.length; i++) {
            if (!intersectionGraph[i].deleted) {
                for (Edge e : intersectionGraph[i].adj) {
                    if (e.target == largest) {
                        intersectionGraph[i].adj.remove(e);
                    }
                }
            }
        }

        return largest;
    }

    private int findLargestNode() {
        int largest = 0;

        for (int i = 1; i < intersectionGraph.length; i++) {
            if (!intersectionGraph[i].deleted
                    && intersectionGraph[i].adj.size() > intersectionGraph[largest].adj.size()) {
                largest = i;
            }
        }

        return largest;
    }

    private void recomputeComponents(int deletedIndex) {
        ArrayList<Node> affectedComponent = new ArrayList<>();

        // Find component of deleted node
        for (ArrayList<Node> comp : components) {
            if (comp.contains(intersectionGraph[deletedIndex])) {
                comp.remove(deletedIndex);
                affectedComponent = comp;
            }
        }

        // Restart dfs
        for (Node node : affectedComponent) {
            node.visited = false;
        }

        int nrNewComponents = 0;

        // Reassign components
        for (Node node : affectedComponent) {
            if (!node.visited && !node.deleted) {
                dfs(node.id, maxComponent + 1);
                maxComponent++;
                nrNewComponents++;
            }
        }

        // Remove old component from main component list
        components.remove(affectedComponent);

        // Create new component lists
        ArrayList<ArrayList<Node>> newComponents = new ArrayList<>();

        for (int i = 0; i < nrNewComponents; i++) {
            newComponents.add(new ArrayList<>());
        }

        // Assign nodes to new components
        for (int i = 0; i < affectedComponent.size(); i++) {
            int currNodeCompIndex = affectedComponent.get(i).comp - (maxComponent - nrNewComponents);
            newComponents.get(currNodeCompIndex).add(affectedComponent.get(i));
        }

        // Add new components to main component list
        for (ArrayList<Node> component : newComponents) {
            components.add(component);
        }
    }

    private void dfs(int node, int component) {
        if (intersectionGraph[node].visited)
            return;
        if (intersectionGraph[node].deleted)
            return;

        intersectionGraph[node].visited = true;
        intersectionGraph[node].comp = component;

        for (Edge e : intersectionGraph[node].adj) {
            dfs(e.target, component);
        }
    }

    private ArrayList<Integer> findSharedStatements(Node node) {
        // Get only statements shared with another entity
        ArrayList<Integer> sharedStatements = new ArrayList<>();

        // Fill the shared statements list
        for (Edge e : node.adj) {
            sharedStatements.addAll(e.statements);
        }

        return sharedStatements;
    }

    private void findUniqueStatements(Node node) {
        // Get all statements of this node
        int[] allStatements = instance.entityIndToStatements.get(node.id);
        // Get only statements shared with another entity
        ArrayList<Integer> sharedStatements = findSharedStatements(node);

        // Get all statement which are only in this entity
        for (int i = 0; i < allStatements.length; i++) {
            if (!sharedStatements.contains(allStatements[i])) {
                node.uniqueStatements.add(allStatements[i]);
            }
        }
    }

    private StatementEntityInstance findSmallestInstance(ArrayList<StatementEntityInstance> instances) {
        int minStatements = Integer.MAX_VALUE;
        StatementEntityInstance smallestInstance = null;

        for (StatementEntityInstance inst : instances) {
            if (inst.statements.size() < minStatements) {
                minStatements = inst.statements.size();
                smallestInstance = inst;
            }
        }

        return smallestInstance;
    }

    public ArrayList<StatementEntityInstance> findSplit() {
        ArrayList<StatementEntityInstance> result = new ArrayList<>();

        // Delete nodes until the graph is disconnected
        while (components.size() == 1) {
            int deletedNode = deleteLargestNode();
            recomputeComponents(deletedNode);
        }

        // Add a copy of each deleted node to each component
        for (Node node : deletedNodes) {
            findUniqueStatements(node);

            for (ArrayList<Node> component : components) {
                component.add(node.copy());

                // Remove edges outside of the component
                for (Edge e : component.get(component.size() - 1).adj) {
                    if (!component.contains(intersectionGraph[e.target])) {
                        component.get(component.size() - 1).adj.remove(e);
                    }
                }
            }
        }

        for (ArrayList<Node> component : components) {
            // Store all entities in this component
            int[] entities = new int[component.size()];

            // Store all statements in this component
            HashSet<Integer> statements = new HashSet<>();

            // Store the entity-statement map for this component
            HashMap<Integer, int[]> entToSt = new HashMap<>();

            for (int i = 0; i < component.size(); i++) {
                // Add each entity
                Node ent = component.get(i);
                entities[i] = ent.id;

                // For non deleted nodes get their statements from the instance
                if (!ent.deleted) {
                    // Add the statements of this entity to the map of this component
                    int[] arr = instance.entityIndToStatements.get(ent.id);
                    entToSt.put(ent.id, arr);

                    // Convert the statement array to an ArrayList (to be added to the hashset)
                    ArrayList<Integer> entStatements = new ArrayList<>();
                    for (int j = 0; j < arr.length; j++) {
                        entStatements.add(arr[j]);
                    }

                    // Add to global statement list for this component
                    statements.addAll(entStatements);
                }
                // For deleted nodes add only their shared statements to the instance
                else {
                    ArrayList<Integer> shared = findSharedStatements(ent);
                    int[] arr =  shared.stream().mapToInt(k -> k).toArray();

                    entToSt.put(ent.id, arr);
                }
            }

            int[] stArr = statements.stream().mapToInt(Integer::intValue).toArray();

            StatementEntityInstance inst = new StatementEntityInstance(entities, stArr, entToSt, instance);
            result.add(inst);

        }

        // Sort deleted nodes in decreasing order based on number of unique statements
        Collections.sort(deletedNodes, (o1, o2) -> (Integer.compare(o2.uniqueStatements.size(), o1.uniqueStatements.size())));

        // Add statements contained only in deleted nodes to the smallest new instance
        for (Node node : deletedNodes) {
            // Find the current smallest instance
            StatementEntityInstance smallestInstance = findSmallestInstance(result);
            
            // Create a map of the statements unique to this deleted node
            HashMap<Integer, String> uniqueStatementMap = new HashMap<>();

            // Fill the map
            for (Integer statementId : node.uniqueStatements) {
                String text = instance.statements.get(statementId);
                uniqueStatementMap.put(statementId, text);
            }

            // Add the statements from the map to the smallest instance
            smallestInstance.statements.putAll(uniqueStatementMap);
        }

        return result;

    }

    public void printGraph() {
        for (int i = 0; i < intersectionGraph.length; i++) {
            System.out.println(instance.entities.get(intersectionGraph[i].id) + " connects to ");

            for (int j = 0; j < intersectionGraph[i].adj.size(); j++) {
                System.out.print(instance.entities.get(intersectionGraph[i].adj.get(j).target) + " ");
            }

            System.out.println("\n");
        }
    }

    public static void main(String[] args) {
        String jsonFilePath = "ILP\\data\\structured_dataset_not_so_small.json";
        StatementEntityInstance instance = new StatementEntityInstance(jsonFilePath);
        GreedySplit splitInstance = new GreedySplit(instance);

        splitInstance.createGraph();
        splitInstance.printGraph();
    }
}