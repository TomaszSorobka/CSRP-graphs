import java.util.ArrayList;
import java.util.HashSet;

class Nodee {
    int id;

    Nodee (int id) {
        this.id = id;
    }
}

public class Test {
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
        System.out.println("-- SET --");
        for (Integer string : set) {
            System.out.println(string);
        }
        System.out.println("set size: " + set.size());

        int[] stArr = set.stream().mapToInt(Integer::intValue).toArray();
        
        System.out.println("-- Array --");
        for (int i = 0; i < stArr.length; i++) {
            System.out.println(stArr[i]);
        }
        System.out.println("array size: " + stArr.length);
    }
}
