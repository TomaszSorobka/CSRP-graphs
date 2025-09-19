package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;

import ilp.ModelContext;

public class P0ValidEntityRowBounds implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        int nEntities = ctx.entityIds.size();
        for (int i = 0; i < nEntities; i++) {
            for (int j = 0; j <= ctx.dimensions; j++) {
                // For each row of the entities, the end of the row is after the start of the row.
                GRBLinExpr differenceOfCoord = new GRBLinExpr();
                differenceOfCoord.addTerm(1.0, ctx.v.entities[i].rowBounds[j][1]);
                differenceOfCoord.addTerm(-1.0, ctx.v.entities[i].rowBounds[j][0]);

                ctx.model.addGenConstrIndicator(ctx.v.entities[i].activeRows[j], 1, differenceOfCoord,
                        GRB.GREATER_EQUAL, 0.0, "e_" + i + "_row_" + j + "_well_defined");

            }
        }
    }
}
