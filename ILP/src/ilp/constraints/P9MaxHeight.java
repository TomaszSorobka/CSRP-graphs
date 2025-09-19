package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

public class P9MaxHeight implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        
        // if e_j = 1 => maxHeight >= j
        for (int i = 0; i < ctx.entityIds.size(); i++) {
            for (int j = 0; j <= ctx.dimensions; j++) {
                GRBLinExpr maxHeight_expr = new GRBLinExpr();
                maxHeight_expr.addTerm(1.0, ctx.v.maxHeight);
                ctx.model.addGenConstrIndicator(ctx.v.entities[i].activeRows[j], 1, maxHeight_expr, GRB.GREATER_EQUAL, j, "P9_" + i + "_h");
            }
        }
    }

}
