import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import org.json.JSONArray;
import org.json.JSONObject;

public class StatementEntityInstance {
    int numberOfStatements;
    int numberOfEntities;
    HashMap<Integer, String> statements;
    HashMap<Integer, String> entities;
    
    // map from entity index to statement indices corresponding to the indices in the arrays entities, statements
    HashMap<Integer, int[]> entityIndToStatements;

    // // Constructor to load JSON data from file
    // public StatementEntityInstance(String jsonFilePath) {
    //     try {
    //         StringBuilder jsonContent = new StringBuilder();
    //         BufferedReader reader = new BufferedReader(new FileReader(jsonFilePath));
    //         String line;
    //         while ((line = reader.readLine()) != null) {
    //             jsonContent.append(line);
    //         }
    //         reader.close();

    //         JSONObject jsonData = new JSONObject(jsonContent.toString());
            
    //         // Load statements
    //         JSONArray statementArray = jsonData.getJSONArray("statements");
    //         numberOfStatements = statementArray.length();
    //         statements = new HashMap<>();
            
    //         for (int i = 0; i < numberOfStatements; i++) {
    //             statements.put(i, statementArray.getJSONObject(i).getString("text"));
    //         }

    //         // Load entities
    //         JSONArray entityArray = jsonData.getJSONArray("entities");
    //         numberOfEntities = entityArray.length();
    //         entities = new HashMap<>();
            
    //         for (int i = 0; i < numberOfEntities; i++) {
    //             entities.put(i, entityArray.getJSONObject(i).getString("name"));
    //         }
            
    //         // Load entity to statement mappings
    //         JSONObject entityStatementsObject = jsonData.getJSONObject("entity_statements");
    //         entityIndToStatements = new HashMap<>();
            
    //         for (String key : entityStatementsObject.keySet()) {
    //             int entityIndex = Integer.parseInt(key);
    //             JSONArray statementIndicesArray = entityStatementsObject.getJSONArray(key);
    //             int[] statementIndices = new int[statementIndicesArray.length()];
                
    //             for (int j = 0; j < statementIndicesArray.length(); j++) {
    //                 statementIndices[j] = statementIndicesArray.getInt(j);
    //             }
                
    //             entityIndToStatements.put(entityIndex, statementIndices);
    //         }
    //     } catch (IOException e) {
    //         e.printStackTrace();
    //     }
    // }

     // NEW Constructor to load JSON data from file (keeping the ids from the dataset)
     public StatementEntityInstance(String jsonFilePath) {
        try {
            StringBuilder jsonContent = new StringBuilder();
            BufferedReader reader = new BufferedReader(new FileReader(jsonFilePath));
            String line;
            while ((line = reader.readLine()) != null) {
                jsonContent.append(line);
            }
            reader.close();

            JSONObject jsonData = new JSONObject(jsonContent.toString());

            // Load statements using their IDs
            JSONArray statementArray = jsonData.getJSONArray("statements");
            numberOfStatements = statementArray.length();
            statements = new HashMap<>();

            for (int i = 0; i < statementArray.length(); i++) {
                JSONObject statementObj = statementArray.getJSONObject(i);
                int id = statementObj.getInt("id");  // Get statement ID
                String text = statementObj.getString("text");
                statements.put(id, text);  // Store using the actual ID
            }

            // Load entities using their IDs
            JSONArray entityArray = jsonData.getJSONArray("entities");
            numberOfEntities = entityArray.length();
            entities = new HashMap<>();

            for (int i = 0; i < entityArray.length(); i++) {
                JSONObject entityObj = entityArray.getJSONObject(i);
                int id = entityObj.getInt("id");  // Get entity ID
                String name = entityObj.getString("name");
                entities.put(id, name);  // Store using the actual ID
            }

            // Load entity to statement mappings
            JSONObject entityStatementsObject = jsonData.getJSONObject("entity_statements");
            entityIndToStatements = new HashMap<>();

            for (String key : entityStatementsObject.keySet()) {
                int entityId = Integer.parseInt(key);  // Entity ID from JSON
                JSONArray statementIndicesArray = entityStatementsObject.getJSONArray(key);
                int[] statementIds = new int[statementIndicesArray.length()];

                for (int j = 0; j < statementIndicesArray.length(); j++) {
                    statementIds[j] = statementIndicesArray.getInt(j);  // Store statement ID
                }

                entityIndToStatements.put(entityId, statementIds);  // Store using the actual entity ID
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public StatementEntityInstance(int[] entities, int[] statements, HashMap<Integer, int[]> entityStatements, StatementEntityInstance inst) {
        numberOfEntities = entities.length;
        numberOfStatements = statements.length;

        // Add entities
        this.entities = new HashMap<>();

        for (int i = 0; i < numberOfEntities; i++) {
            String name = inst.entities.get(entities[i]);
            this.entities.put(entities[i], name);
        }

        // Add statements
        this.statements = new HashMap<>();

        for (int i = 0; i < numberOfStatements; i++) {
            String text = inst.statements.get(statements[i]);
            this.statements.put(statements[i], text);
        }

        // Add entity to statement map
        this.entityIndToStatements = new HashMap<>(entityStatements);
    }
    
    public static void main(String[] args) {
        String jsonFilePath = "ILP\\data\\structured_dataset_small.json";
        StatementEntityInstance instance = new StatementEntityInstance(jsonFilePath);
        System.out.println("Loaded " + instance.numberOfStatements + " statements and " + instance.numberOfEntities + " entities.");
    }
}
