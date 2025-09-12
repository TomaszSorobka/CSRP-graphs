package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

// Bound the sum of the width and height
public class C3TotalLayoutSize implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        // Sum of width height constraint
        GRBLinExpr totalSize = new GRBLinExpr();
        totalSize.addTerm(1.0, ctx.v.maxHeight);
        totalSize.addTerm(1.0, ctx.v.maxWidth);
        ctx.model.addConstr(totalSize, GRB.LESS_EQUAL, 8.0, "total_layout_size");
    }
}
