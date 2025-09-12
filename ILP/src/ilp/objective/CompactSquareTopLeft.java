package ilp.objective;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

public class CompactSquareTopLeft implements ObjectiveModule {

    @Override
    public void apply(ModelContext ctx) throws GRBException {
        GRBLinExpr MINIMIZE_ME = new GRBLinExpr();
        MINIMIZE_ME.addTerm(1.0, ctx.v.diff);
        MINIMIZE_ME.addTerm(2.0, ctx.v.maxHeight);
        MINIMIZE_ME.addTerm(2.0, ctx.v.maxWidth);

        for (int i = 0; i < ctx.entityIds.size(); i++) {
            MINIMIZE_ME.addTerm(1.0, ctx.v.entityCoordinates[i][2]);
            MINIMIZE_ME.addTerm(-1.0, ctx.v.entityCoordinates[i][0]);
            MINIMIZE_ME.addTerm(1.0, ctx.v.entityCoordinates[i][3]);
            MINIMIZE_ME.addTerm(-1.0, ctx.v.entityCoordinates[i][1]);
        }

        // Favor top left
        for (int i = 0; i < ctx.statementIds.size(); i++) {
            MINIMIZE_ME.addTerm(0.5, ctx.v.statementCoordinates[i][0]);
            MINIMIZE_ME.addTerm(0.5, ctx.v.statementCoordinates[i][1]);
        }

        ctx.model.setObjective(MINIMIZE_ME, GRB.MINIMIZE);
    }

}
