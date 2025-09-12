package ilp.variables;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBModel;
import com.gurobi.gurobi.GRBVar;

public final class VarsFactory {
    private VarsFactory() {}

    /** Creates all variables */
    public static Vars create(GRBModel model,
                              int nEntities,
                              int nStatements,
                              int coordLowerBound,
                              int coordUpperBound) throws GRBException {
        Vars v = new Vars();

        // statement coordinates: statementCoordinates[i][x/y]
        v.statementCoordinates = new GRBVar[nStatements][2];
        for (int i = 0; i < nStatements; i++) {
            v.statementCoordinates[i][0] = model.addVar(coordLowerBound, coordUpperBound, 0.0, GRB.INTEGER, "s" + i + "_x");
            v.statementCoordinates[i][1] = model.addVar(coordLowerBound, coordUpperBound, 0.0, GRB.INTEGER, "s" + i + "_y");
        }

        // entity coordinates: entityCoordinates[i][x1,y1,x2,y2]
        v.entityCoordinates = new GRBVar[nEntities][4];
        for (int i = 0; i < nEntities; i++) {
            for (int j = 0; j < 4; j++) {
                v.entityCoordinates[i][j] = model.addVar(coordLowerBound, coordUpperBound, 0.0, GRB.INTEGER,
                        "e" + i + "_" + (j % 2 == 0 ? "x" : "y") + (j / 2 == 0 ? "_t" : "_b"));
            }
        }

        // extra vars: TODO: upper bound does not need to be integer max value
        v.useYAlignment = model.addVar(0, 1, 0.0, GRB.BINARY, "useYAlignment");
        v.maxWidth      = model.addVar(0.0, Integer.MAX_VALUE, 0.0, GRB.INTEGER, "maxWidth");
        v.maxHeight     = model.addVar(0.0, Integer.MAX_VALUE, 0.0, GRB.INTEGER, "maxHeight");
        v.diff          = model.addVar(0.0, Integer.MAX_VALUE, 0.0, GRB.INTEGER, "diff");

        return v;
    }
}
