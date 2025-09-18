package ilp.variables;

import com.gurobi.gurobi.GRBVar;

public abstract class Vars {
    // Statement vars: [nStatements][2] => x,y
    public GRBVar[][] statementCoordinates;
    // Entity vars: [nEntities][4] => x1,y1,x2,y2
    public GRBVar[][] entityCoordinates;
    // Entity vars: active rows and coordinates of each row
    public GurobiEntity[] entities;
    
    // Others    
    public GRBVar maxWidth;
    public GRBVar maxHeight;
    public GRBVar diff;
}
