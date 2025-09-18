package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

public class P1ConsecutiveEntityRows implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        int nEntities = ctx.entityIds.size();

        // if rows j-1 and j+1 are active, then row j should also be active
        // e_j >= e_(j-1) + e_(j+1) - 1
        for (int i = 0; i < nEntities; i++) {
            for (int j = 1; j < ctx.dimensions; j++) {
                GRBLinExpr rhs = new GRBLinExpr();
                rhs.addTerm(1.0, ctx.v.entities[i].activeRows[j - 1]);
                rhs.addTerm(1.0, ctx.v.entities[i].activeRows[j + 1]);
                rhs.addConstant(-1.0);

                ctx.model.addConstr(ctx.v.entities[i].activeRows[j], GRB.GREATER_EQUAL, rhs,
                        "e_" + i + "nonempty_row_" + j);
            }
        }
    }

}
