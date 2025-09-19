package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

public class P8MaxWidth implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        
        // if e_j = 1 -> maxWidth >= e_j1
        for (int i = 0; i < ctx.entityIds.size(); i++) {
            for (int j = 0; j <= ctx.dimensions; j++) {
                GRBLinExpr maxWidth_expr = new GRBLinExpr();
                maxWidth_expr.addTerm(1.0, ctx.v.maxWidth);
                maxWidth_expr.addTerm(-1.0, ctx.v.entities[i].rowBounds[j][1]);
                ctx.model.addGenConstrIndicator(ctx.v.entities[i].activeRows[j], 1, maxWidth_expr, GRB.GREATER_EQUAL, 0, "P8_" + i + "_w");
            }

        }
    }
}
