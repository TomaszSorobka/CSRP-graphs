package ilp.constraints;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;
import com.gurobi.gurobi.GRBVar;

import ilp.ModelContext;
import ilp.variables.VarsPolygons;

public class P13aRowSpanNonIncreasing implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        if ((ctx.v instanceof VarsPolygons v)) { // only add this constraint for polygon solutions
            for (int i = 0; i < ctx.entityIds.size(); i++) {
                for (int r = 0; r < ctx.dimensions; r++) {
                    GRBLinExpr leftDiff = new GRBLinExpr();
                    leftDiff.addTerm(1.0, v.entities[i].rowBounds[r][0]);
                    leftDiff.addTerm(-1.0, v.entities[i].rowBounds[r + 1][0]);

                    //enforce rowBounds[r][0] >= rowBounds[r+1][0]
                    ctx.model.addConstr(leftDiff, GRB.LESS_EQUAL, 0.0, "monoDec_" + i + "_" + r);

                    GRBLinExpr rightDiff = new GRBLinExpr();
                    rightDiff.addTerm(1.0, v.entities[i].rowBounds[r][1]);
                    rightDiff.addTerm(-1.0, v.entities[i].rowBounds[r + 1][1]);

                    // enforce rowBounds[r][1] >= rowBounds[r+1][1]
                    ctx.model.addConstr(rightDiff, GRB.GREATER_EQUAL, 0.0, "monoDec_" + i + "_" + r);
                }
            }
        }
    }

}
