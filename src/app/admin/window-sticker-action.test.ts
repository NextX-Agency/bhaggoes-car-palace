import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, type Vehicle } from "@/lib/domain";

// Supabase, the data layer and Next's cache are replaced; the quota code and the action are the real ones.
const state = vi.hoisted(() => ({ files: new Set<string>(), role: "admin" as string | null, user: true, vehicle: true, storageDown: false }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user ? { id: "u1" } : null } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.role ? { role: state.role } : null }) }) }) }),
    storage: { from: () => ({
      upload: async (path: string) => {
        if (state.storageDown) return { error: { message: "fetch failed" } };
        if (state.files.has(path)) return { error: { statusCode: "409", error: "Duplicate", message: "The resource already exists" } };
        state.files.add(path); return { error: null };
      },
      list: async (folder: string) => ({ data: [...state.files].filter((path) => path.startsWith(`${folder}/`)).map((path) => ({ name: path.split("/").pop() })), error: null }),
    }) },
  }),
}));
const vehicle = { id: "00000000-0000-4000-8000-000000000001", title: "Toyota Harrier", make: "Toyota", model: "Harrier", variant: null, year: 2018, price: 30000, cash_price: 28500, currency: "USD", condition: "used", features: [], stock_number: "BCP-1" } as unknown as Vehicle;
vi.mock("@/lib/data", () => ({
  getAdminVehicle: async () => state.vehicle ? { vehicle, privateDetails: { vin: "VIN-SECRET", admin_notes: "NOTE-SECRET" } } : null,
  getSettings: async () => defaultSettings,
}));

const { openWindowStickerAction } = await import("./actions");
const id = vehicle.id;

beforeEach(() => { state.files.clear(); Object.assign(state, { role: "admin", user: true, vehicle: true, storageDown: false }); vi.unstubAllEnvs(); });

describe("openWindowStickerAction", () => {
  it("returns the sticker three times, then only the lock", async () => {
    const first = await openWindowStickerAction(id);
    expect(first.sticker?.heading).toBe("Toyota Harrier");
    expect(first.usesLeft).toBe(2);
    expect((await openWindowStickerAction(id)).usesLeft).toBe(1);
    expect((await openWindowStickerAction(id)).usesLeft).toBe(0);
    for (let index = 0; index < 3; index++) {
      const locked = await openWindowStickerAction(id);
      expect(locked).toEqual({ locked: true, usesLeft: 0 });
    }
  });

  it("counts the same for every car: three in total, not per car", async () => {
    await openWindowStickerAction(id);
    await openWindowStickerAction("00000000-0000-4000-8000-000000000002");
    await openWindowStickerAction("00000000-0000-4000-8000-000000000003");
    expect((await openWindowStickerAction("00000000-0000-4000-8000-000000000004")).locked).toBe(true);
  });

  it("gives nothing and uses nothing to someone who is not an administrator", async () => {
    state.role = "staff";
    expect(await openWindowStickerAction(id)).toEqual({ error: "Beheerderstoegang is vereist." });
    state.role = "admin"; state.user = false;
    expect((await openWindowStickerAction(id)).sticker).toBeUndefined();
    expect(state.files.size).toBe(0);
  });

  it("uses nothing for an unknown or invalid car", async () => {
    expect((await openWindowStickerAction("not-a-uuid")).error).toBeTruthy();
    state.vehicle = false;
    expect((await openWindowStickerAction(id)).error).toBeTruthy();
    expect(state.files.size).toBe(0);
  });

  it("shows nothing when storage is down, so a failure never prints for free", async () => {
    state.storageDown = true;
    const result = await openWindowStickerAction(id);
    expect(result.sticker).toBeUndefined();
    expect(result.error).toMatch(/niets verbruikt/);
  });

  it("never sends staff-only fields to the browser", async () => {
    const text = JSON.stringify(await openWindowStickerAction(id));
    expect(text).not.toContain("VIN-SECRET");
    expect(text).not.toContain("NOTE-SECRET");
  });

  it("stays unlimited after NextX unlocks it", async () => {
    vi.stubEnv("WINDOW_STICKER_UNLOCKED", "true");
    for (let index = 0; index < 6; index++) expect((await openWindowStickerAction(id)).sticker).toBeDefined();
  });
});
