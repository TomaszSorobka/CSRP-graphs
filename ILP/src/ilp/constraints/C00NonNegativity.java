package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import ilp.ModelContext;

/** All coordinates are non-negative (C00) */
public final class C00NonNegativity implements ConstraintModule {
  @Override public void add(ModelContext c) throws GRBException {
    int nS = c.statementIds.size(), nE = c.entityIds.size();
    for (int i = 0; i < nS; i++) {
      c.model.addConstr(c.v.statementCoordinates[i][0], GRB.GREATER_EQUAL, 0, "C00_" + i + "_x");
      c.model.addConstr(c.v.statementCoordinates[i][1], GRB.GREATER_EQUAL, 0, "C00_" + i + "_y");
    }
    for (int i = 0; i < nE; i++) {
      for (int j = 0; j < 4; j++) {
        c.model.addConstr(c.v.entityCoordinates[i][j], GRB.GREATER_EQUAL, 0, "C00_e_" + i + "_" + j);
      }
    }
  }
}