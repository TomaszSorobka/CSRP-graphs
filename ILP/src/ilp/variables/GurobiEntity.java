package ilp.variables;

import com.gurobi.gurobi.GRBVar;

public class GurobiEntity {
    // Boolean variable defining which rows of the grid are used by this entity
    public GRBVar[] activeRows;
    
    // for each row, its start cell and end cell coordinates
    public GRBVar[][] rowBounds;

    public GurobiEntity(GRBVar[] activeRows, GRBVar[][] rowBounds) {
        this.activeRows = activeRows;
        this.rowBounds = rowBounds;
    }

}
