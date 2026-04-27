/** @vitest-environment node */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Fluent query-builder mock that remembers the last operation.
type QueryRecord = {
  table: string;
  op: "select" | "update" | "delete" | "insert";
  payload?: Record<string, unknown>;
  eqs: Array<{ col: string; val: unknown }>;
};

const queryLog: QueryRecord[] = [];
let nextSelectResult: { data: unknown; error: null } = { data: null, error: null };

function tableMock(table: string) {
  const rec: QueryRecord = { table, op: "select", eqs: [] };

  const builder: Record<string, unknown> = {};
  builder.select = () => {
    rec.op = "select";
    queryLog.push(rec);
    return builder;
  };
  builder.update = (payload: Record<string, unknown>) => {
    rec.op = "update";
    rec.payload = payload;
    queryLog.push(rec);
    return builder;
  };
  builder.delete = () => {
    rec.op = "delete";
    queryLog.push(rec);
    return builder;
  };
  builder.insert = (payload: Record<string, unknown>) => {
    rec.op = "insert";
    rec.payload = payload;
    queryLog.push(rec);
    return Promise.resolve({ data: null, error: null });
  };
  builder.eq = (col: string, val: unknown) => {
    rec.eqs.push({ col, val });
    if (rec.op === "update" || rec.op === "delete") {
      return Promise.resolve({ data: null, error: null });
    }
    return builder;
  };
  builder.maybeSingle = () => Promise.resolve(nextSelectResult);
  builder.single = () => Promise.resolve(nextSelectResult);
  return builder;
}

const storageRemove = vi.fn().mockResolvedValue({ data: null, error: null });
const storageFrom = vi.fn().mockReturnValue({ remove: storageRemove });

vi.mock("@/lib/supabase/client", () => ({
  supabaseAdmin: {
    from: (table: string) => tableMock(table),
    storage: {
      from: (bucket: string) => storageFrom(bucket),
    },
  },
  isSupabaseConfigured: true,
}));

import { applyModerationDecision } from "./actions";

function findQuery(
  table: string,
  op: QueryRecord["op"]
): QueryRecord | undefined {
  return queryLog.find((q) => q.table === table && q.op === op);
}

describe("applyModerationDecision", () => {
  beforeEach(() => {
    queryLog.length = 0;
    storageRemove.mockClear();
    storageFrom.mockClear();
    nextSelectResult = { data: null, error: null };
  });

  describe("photo content type", () => {
    it("flips user_photos.status to approved on approve", async () => {
      await applyModerationDecision({
        contentType: "photo",
        contentId: "photo-1",
        userId: "user-1",
        decision: "approved",
        reviewerId: "mod-1",
      });

      const update = findQuery("user_photos", "update");
      expect(update).toBeDefined();
      expect(update?.payload).toMatchObject({
        status: "approved",
        reviewed_by: "mod-1",
      });
      expect(update?.payload?.reviewed_at).toBeTypeOf("string");
      expect(update?.eqs).toEqual([{ col: "id", val: "photo-1" }]);

      expect(storageRemove).not.toHaveBeenCalled();
    });

    it("deletes storage object and user_photos row on reject", async () => {
      nextSelectResult = {
        data: { storage_key: "user-1/gallery/photo-1" },
        error: null,
      };

      await applyModerationDecision({
        contentType: "photo",
        contentId: "photo-1",
        userId: "user-1",
        decision: "rejected",
        reviewerId: "mod-1",
      });

      expect(storageFrom).toHaveBeenCalledWith("profile-photos");
      expect(storageRemove).toHaveBeenCalledWith(["user-1/gallery/photo-1"]);

      const del = findQuery("user_photos", "delete");
      expect(del).toBeDefined();
      expect(del?.eqs).toEqual([{ col: "id", val: "photo-1" }]);
    });

    it("deletes storage object and user_photos row on delete", async () => {
      nextSelectResult = {
        data: { storage_key: "user-1/gallery/photo-1" },
        error: null,
      };

      await applyModerationDecision({
        contentType: "photo",
        contentId: "photo-1",
        userId: "user-1",
        decision: "deleted",
        reviewerId: "mod-1",
      });

      expect(storageRemove).toHaveBeenCalledWith(["user-1/gallery/photo-1"]);
      expect(findQuery("user_photos", "delete")).toBeDefined();
    });
  });
});
