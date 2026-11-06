import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadVehiclePhotos } from "./vehicle-photo-upload";

describe("uploadVehiclePhotos", () => {
  it("includes saved photos when completing a later upload attempt", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "photo-3" }, error: null }) }) }));
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const client = { storage: { from: () => ({ upload }) }, from: () => ({ insert }), rpc } as unknown as SupabaseClient;
    const file = new File(["photo"], "retry.jpg", { type: "image/jpeg" });
    const result = await uploadVehiclePhotos({ client, vehicleId: "vehicle-1", files: [file], existing: [{ id: "photo-1", sort_order: 0 }, { id: "photo-2", sort_order: 1 }], altBase: "Car" });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 2 }));
    expect(rpc).toHaveBeenCalledWith("reorder_vehicle_images", { p_vehicle_id: "vehicle-1", p_image_ids: ["photo-1", "photo-2", "photo-3"] });
    expect(result.ordered).toBe(true);
    expect(result.issues).toEqual([]);
    URL.revokeObjectURL(result.uploaded[0].url);
  });

  it("retries a temporary storage error and keeps database positions when reordering fails", async () => {
    const upload = vi.fn()
      .mockResolvedValueOnce({ error: { statusCode: "500" } })
      .mockResolvedValueOnce({ error: null });
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: "photo-1" }, error: null }) }) }));
    const client = {
      storage: { from: () => ({ upload }) },
      from: () => ({ insert }),
      rpc: async () => ({ error: { message: "order failed" } }),
    } as unknown as SupabaseClient;
    const file = new File(["photo"], "car.jpg", { type: "image/jpeg" });
    const result = await uploadVehiclePhotos({ client, vehicleId: "vehicle-1", files: [file], existing: [{ id: "existing-1", sort_order: 1 }], altBase: "Car" });

    expect(upload).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 0 }));
    expect(result.uploaded).toHaveLength(1);
    expect(result.uploaded[0].sort_order).toBe(0);
    expect(result.ordered).toBe(false);
    expect(result.retry).toEqual([]);
    expect(result.issues).toHaveLength(1);
    URL.revokeObjectURL(result.uploaded[0].url);
  });
});
