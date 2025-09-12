package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

// Ensure squareness, difference between max width and max height is minimized
// (H10)
public class H10Squareness implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {

        GRBLinExpr positiveDiff = new GRBLinExpr();
        positiveDiff.addTerm(1.0, ctx.v.diff);
        positiveDiff.addTerm(-1.0, ctx.v.maxWidth);
        positiveDiff.addTerm(1.0, ctx.v.maxHeight);
        ctx.model.addConstr(positiveDiff, GRB.GREATER_EQUAL, 0, "H10_+diff");

        GRBLinExpr negativeDiff = new GRBLinExpr();
        negativeDiff.addTerm(1.0, ctx.v.diff);
        negativeDiff.addTerm(1.0, ctx.v.maxWidth);
        negativeDiff.addTerm(-1.0, ctx.v.maxHeight);
        ctx.model.addConstr(negativeDiff, GRB.GREATER_EQUAL, 0, "H10_-diff");

    }

}
