package ilp.constraints;

import java.util.Arrays;

import com.gurobi.gurobi.GRB;
import com.gurobi.gurobi.GRBException;
import com.gurobi.gurobi.GRBLinExpr;
import com.gurobi.gurobi.GRBVar;

import ilp.ModelContext;

public class P5OutsideNonMembers implements ConstraintModule {

    @Override
    public void add(ModelContext ctx) throws GRBException {
        int nStatements = ctx.inst.numberOfStatements;
        int nEntities = ctx.entityIds.size();

        for (int i = 0; i < nEntities; i++) {
            int entityId = ctx.entityIds.get(i);

            for (int st = 0; st < nStatements; st++) {
                final int statementIdFinal = ctx.statementIds.get(st);
                if (Arrays.stream(ctx.inst.entityIndToStatements.get(entityId))
                        .noneMatch(x -> x == statementIdFinal)) {

                    for (int j = 0; j <= ctx.dimensions; j++) {
                        GRBVar b1 = ctx.model.addVar(0.0, 1.0, 0.0, GRB.BINARY, "left_of_entity_b1");
                        GRBLinExpr left_of_ent = new GRBLinExpr();
                        left_of_ent.addTerm(1.0, ctx.v.entities[i].rowBounds[j][0]);
                        left_of_ent.addTerm(-1.0, ctx.v.statementCoordinates[st][0]);

                        ctx.model.addGenConstrIndicator(b1, 1, left_of_ent,
                                GRB.GREATER_EQUAL, 1.0, "e_" + i + "_row_" + j + "_b1=1_implies_leftOfEntity");

                        GRBVar b2 = ctx.model.addVar(0.0, 1.0, 0.0, GRB.BINARY, "left_of_entity_b1");
                        GRBLinExpr right_of_ent = new GRBLinExpr();
                        right_of_ent.addTerm(1.0, ctx.v.entities[i].rowBounds[j][1]);
                        right_of_ent.addTerm(-1.0, ctx.v.statementCoordinates[st][0]);

                        ctx.model.addGenConstrIndicator(b2, 1, right_of_ent,
                                GRB.LESS_EQUAL, -1.0, "e_" + i + "_row_" + j + "_b2=1_implies_rightOfEntity");

                        GRBVar isOnRow_j = ctx.model.addVar(0, 1, 0, GRB.BINARY, "isOnRow_j_" + st);
                        // If isOnRow_j == 1 then s_y == j
                        GRBLinExpr s_y = new GRBLinExpr();
                        s_y.addTerm(1.0, ctx.v.statementCoordinates[st][1]);
                        ctx.model.addGenConstrIndicator(isOnRow_j, 1, s_y, GRB.EQUAL, j, "row_match_" + st);

                        // If s is on row j, then either the entity is not on that row, or the statement
                        // is left or right of the entity
                        // if s_y = j then (e_j=0 or s_x < e_j0 or s_x > e_j1)
                        GRBLinExpr orExpr = new GRBLinExpr();
                        orExpr.addTerm(1.0, b1);
                        orExpr.addTerm(1.0, b2);
                        orExpr.addTerm(-1.0, ctx.v.entities[i].activeRows[j]);
                        ctx.model.addGenConstrIndicator(isOnRow_j, 1, orExpr, GRB.GREATER_EQUAL, 0, "row_match_" + st);

                    }

                }

            }

        }
    }

}
