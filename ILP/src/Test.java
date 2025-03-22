import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;

class Nodee {
    int id;

    Nodee (int id) {
        this.id = id;
    }
}

public class Test {

    private static int[] removeDuplicates(int[] arr) {
        LinkedHashSet<Integer> set = new LinkedHashSet<>();
        
        // Add elements to LinkedHashSet to remove duplicates
        for (int num : arr) {
            set.add(num);
        }
        
        // Convert the set back to an int array
        int[] uniqueArray = new int[set.size()];
        int i = 0;
        for (int num : set) {
            uniqueArray[i++] = num;
        }
        
        return uniqueArray;
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

    public static boolean containsId(int id, ArrayList<Node> component) {
        return component.stream().anyMatch(o -> id == o.id);
    }

    public static void main(String[] args) {
        ArrayList<Nodee> test = new ArrayList<>();
        HashSet<Integer> set = new HashSet<>();
        set.add(1);
        set.add(2);
        set.add(1);
        set.add(3);
        set.add(1);
        // Nodee node1 = new Nodee(14);
        // Nodee node2 = new Nodee(1);
        // Nodee node3 = new Nodee(20);
        // test.add(node1);
        // test.add(node2);
        // test.add(node3);

        // test.remove(node2);
        // System.out.println("-- SET --");
        // for (Integer string : set) {
        //     System.out.println(string);
        // }
        // System.out.println("set size: " + set.size());

        // int[] stArr = set.stream().mapToInt(Integer::intValue).toArray();
        
        // System.out.println("-- Array --");
        // for (int i = 0; i < stArr.length; i++) {
        //     System.out.println(stArr[i]);
        // }
        // System.out.println("array size: " + stArr.length);

        int[] dup = {1, 1, 2};
        int[] unique = removeDuplicates(dup);
        // System.out.println(unique.length);

        // ArrayList<ArrayList<Integer>> result = generateCombinations(28, 5);

        // for (ArrayList<Integer> arrayList : result) {
        //     System.out.println(arrayList);
        // }

        // ArrayList<Node> nodeList = new ArrayList<>();
        // nodeList.add(new Node(0));
        // nodeList.add(new Node(1));
        // nodeList.add(new Node(5));
        // nodeList.add(new Node(4));
        // nodeList.add(new Node(7));

        // System.out.println(containsId(90, nodeList));

        // int[] oldArray = {1, 2, 3};

        // // Create a new array with one more slot
        // int[] newArray = Arrays.copyOf(oldArray, oldArray.length + 1);

        // // Add the new element at the end
        // newArray[oldArray.length] = 4;

        // // Output: [a, b, c, d]
        // System.out.println(Arrays.toString(newArray));

        // Get arrays for the unique and shared statements of this node
        int[] uniqueArr = {1, 2, 3};
        int[] sharedArr = {100, 200, 300};

        // Make a combined array
        int[] combinedArr = Arrays.copyOf(sharedArr, sharedArr.length + uniqueArr.length);

        System.arraycopy(uniqueArr, 0, combinedArr, sharedArr.length, uniqueArr.length);

        System.out.println(Arrays.toString(combinedArr));

        // System.out.println(result.size());
        // Solution sol = new Solution(0, 0, null, null);
        // StatementEntityInstance inst = new StatementEntityInstance(null);
        // StatementEntitySolution.saveSolutionToFile(sol, inst, "Visualization/Solutions/component_" + test + ".txt");
    }
}
