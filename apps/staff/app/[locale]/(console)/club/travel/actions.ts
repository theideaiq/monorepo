"use server";

import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import { errorFields, failure, success } from "@/lib/admin/action-state";
import { uuid } from "@/lib/admin/forms";
import {
  requirementRow,
  requirementSchema,
  routeLinkSchema,
  routeNeedsCheck,
  routeRow,
  routeSchema,
} from "@/lib/admin/travel";

// The Travel Kit's templates. Editors write them as themselves (RLS lets
// the editor role in, with an AAL2 session).

export const saveTravelRoute = staffAction(
  "editorial",
  routeSchema,
  async ({ input, supabase }) => {
    if (routeNeedsCheck(input)) {
      return failure("routeNeedsCheck", errorFields.routeNeedsCheck);
    }
    const row = routeRow(input);
    if (input.id) {
      affected(
        await supabase
          .from("travel_routes")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
      return success();
    }
    const { data } = check(
      await supabase.from("travel_routes").insert(row).select("id").single()
    );
    return success("saved", { redirectTo: `/club/travel/${data?.id}` });
  }
);

export const deleteTravelRoute = staffAction(
  "editorial",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("travel_routes")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted", { redirectTo: "/club/travel" });
  }
);

/** Adds a line to a route or a program, or changes one (its parent stays). */
export const saveTravelRequirement = staffAction(
  "editorial",
  requirementSchema,
  async ({ input, supabase }) => {
    const row = requirementRow(input);
    if (input.id) {
      affected(
        await supabase
          .from("travel_requirements")
          .update(row)
          .eq("id", input.id)
          .select("id")
      );
      return success();
    }
    if (!(input.routeId || input.opportunityId)) {
      throw new ActionFailure("invalid");
    }
    check(
      await supabase.from("travel_requirements").insert({
        ...row,
        opportunity_id: input.opportunityId,
        route_id: input.routeId,
      })
    );
    return success();
  }
);

export const deleteTravelRequirement = staffAction(
  "editorial",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("travel_requirements")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted");
  }
);

/** The routes an opportunity's travellers take. */
export const linkTravelRoute = staffAction(
  "editorial",
  routeLinkSchema,
  async ({ input, supabase }) => {
    check(
      await supabase.from("opportunity_travel_routes").insert({
        opportunity_id: input.opportunityId,
        route_id: input.routeId,
      })
    );
    return success();
  }
);

export const unlinkTravelRoute = staffAction(
  "editorial",
  routeLinkSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("opportunity_travel_routes")
        .delete()
        .eq("opportunity_id", input.opportunityId)
        .eq("route_id", input.routeId)
        .select("route_id")
    );
    return success("deleted");
  }
);
