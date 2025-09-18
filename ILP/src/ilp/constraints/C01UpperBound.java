package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import ilp.ModelContext;

/** All coordinates are at most gridMax (C01) */
public final class C01UpperBound implements ConstraintModule {
  @Override public void add(ModelContext c) throws GRBException {
    int nS = c.statementIds.size(), nE = c.entityIds.size();
    int U = c.gridMax;
    for (int i = 0; i < nS; i++) {
      c.model.addConstr(c.v.statementCoordinates[i][0], GRB.LESS_EQUAL, U, "C01_" + i + "_x");
      c.model.addConstr(c.v.statementCoordinates[i][1], GRB.LESS_EQUAL, U, "C01_" + i + "_y");
    }
    for (int i = 0; i < nE; i++) {
      for (int j = 0; j < 4; j++) {
        c.model.addConstr(c.v.entityCoordinates[i][j], GRB.LESS_EQUAL, U, "C01_e_" + i + "_" + j);
      }
    }
  }
}
