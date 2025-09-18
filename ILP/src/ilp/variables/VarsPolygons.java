package ilp.variables;

import com.gurobi.gurobi.GRBVar;

public class VarsPolygons extends Vars{
    // Statement vars: [nStatements][2] => x,y
    public GRBVar[][] statementCoordinates;

    // Entity vars: active rows and coordinates of each row
    public GurobiEntity[] entities;
    
    // Others    
    public GRBVar maxWidth;
    public GRBVar maxHeight;
    public GRBVar diff;
}

