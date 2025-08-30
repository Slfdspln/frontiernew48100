// supabase/functions/verify-membership-and-reset/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type MembershipCheckResult = {
  isMember: boolean;
  raw?: any;
};

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;

// Adjust this to match your actual membership endpoint once confirmed
async function checkMembership({
  baseUrl,
  apiKey,
  identifier,
  path,
}: {
  baseUrl: string;
  apiKey: string;
  identifier: { email?: string; externalId?: string };
  path?: string;
}): Promise<MembershipCheckResult> {
  const endpointPath = path || "/api/members/verify"; // TODO: replace with real path
  const url = `${baseUrl}${endpointPath}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Common patterns: x-api-key or Authorization: Bearer
      "x-api-key": apiKey,
    },
    body: JSON.stringify(identifier),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Frontier membership check failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const isMember = Boolean(
    data?.isMember ?? data?.member ?? (data?.status === "active")
  );

  return { isMember, raw: data };
}

Deno.serve(async (req) => {
  try {
    const FRONTIER_API_KEY = Deno.env.get("FRONTIER_API_KEY");
    const FRONTIER_BASE_URL = Deno.env.get("FRONTIER_BASE_URL");
    const FRONTIER_MEMBERSHIP_PATH = Deno.env.get("FRONTIER_MEMBERSHIP_PATH");

    if (!FRONTIER_API_KEY || !FRONTIER_BASE_URL) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Supabase env missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authed user from JWT
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = user.email ?? undefined;
    if (!email) {
      return new Response(JSON.stringify({ error: "User has no email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1) Check membership
    const membership = await checkMembership({
      baseUrl: FRONTIER_BASE_URL,
      apiKey: FRONTIER_API_KEY,
      identifier: { email },
      path: FRONTIER_MEMBERSHIP_PATH || undefined,
    });

    if (!membership.isMember) {
      return new Response(
        JSON.stringify({
          isMember: false,
          message: "User is not an active member",
          frontier: membership.raw ?? null,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2) Upsert/reset logic
    const { data: existing, error: selErr } = await supabase
      .from("reset_periods")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selErr) {
      return new Response(JSON.stringify({ error: selErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let didReset = false;
    let lastResetAt: Date | null = existing?.last_reset_at
      ? new Date(existing.last_reset_at)
      : null;

    if (!existing) {
      const { data: inserted, error: insErr } = await supabase
        .from("reset_periods")
        .insert({
          user_id: user.id,
          last_reset_at: now.toISOString(),
          reset_count: 1,
          last_membership_checked_at: now.toISOString(),
          last_membership_result: membership.raw ?? null,
        })
        .select("*")
        .single();

      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      didReset = true;
      lastResetAt = new Date(inserted.last_reset_at!);
    } else {
      const elapsed = now.getTime() - new Date(existing.last_reset_at).getTime();
      if (elapsed >= DAYS_30_MS) {
        const { data: updated, error: updErr } = await supabase
          .from("reset_periods")
          .update({
            last_reset_at: now.toISOString(),
            reset_count: (existing.reset_count ?? 0) + 1,
            last_membership_checked_at: now.toISOString(),
            last_membership_result: membership.raw ?? null,
          })
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (updErr) {
          return new Response(JSON.stringify({ error: updErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        didReset = true;
        lastResetAt = new Date(updated.last_reset_at!);
      } else {
        // no reset—just update membership snapshot
        await supabase
          .from("reset_periods")
          .update({
            last_membership_checked_at: now.toISOString(),
            last_membership_result: membership.raw ?? null,
          })
          .eq("user_id", user.id);
      }
    }

    const nextResetAt = lastResetAt
      ? new Date(lastResetAt.getTime() + DAYS_30_MS)
      : new Date(now.getTime() + DAYS_30_MS);

    const msRemaining = Math.max(0, nextResetAt.getTime() - now.getTime());

    return new Response(
      JSON.stringify({
        isMember: true,
        didReset,
        lastResetAt: lastResetAt?.toISOString() ?? null,
        nextResetAt: nextResetAt.toISOString(),
        msRemaining,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e?.message ?? "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
