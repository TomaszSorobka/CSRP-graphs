package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

// Max width constraint used in the objective function (H8)
public class H8MaxWidth implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        for (int i = 0; i < ctx.entityIds.size(); i++) {
            GRBLinExpr expr = new GRBLinExpr();
            expr.addTerm(1.0, ctx.v.maxWidth);
            expr.addTerm(-1.0, ctx.v.entityCoordinates[i][2]);
            ctx.model.addConstr(expr, GRB.GREATER_EQUAL, 0, "H8_" + i + "_w");
        }
    }
}
