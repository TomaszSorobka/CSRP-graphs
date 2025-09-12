package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

// Max height constraint used in the objective function (H9)
public class H9MaxHeight implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        for (int i = 0; i < ctx.entityIds.size(); i++) {
            GRBLinExpr expr = new GRBLinExpr();
            expr.addTerm(1.0, ctx.v.maxHeight);
            expr.addTerm(-1.0, ctx.v.entityCoordinates[i][3]);
            ctx.model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H9_" + i + "_h");

        }
    }
}