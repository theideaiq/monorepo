import { beforeEach, describe, expect, it, vi } from "vitest";

const removeFiles = vi.fn();
vi.mock("@repo/storage", () => ({
  buckets: { programDocuments: { id: "program-documents" } },
  removeFiles: (...args: unknown[]) => removeFiles(...args),
}));
vi.mock("server-only", () => ({}));

const { sweepProgramDocuments } = await import("@/lib/program-documents");

const adminReturning = (result: { data: unknown; error: unknown }) =>
  ({ rpc: vi.fn(() => Promise.resolve(result)) }) as never;

describe("sweepProgramDocuments", () => {
  beforeEach(() => removeFiles.mockReset());

  it("removes the scans the database forgot", async () => {
    const admin = adminReturning({
      data: [
        { application_id: "a1", files: ["u1/p1/a.jpg", "u1/p1/b.pdf"] },
        { application_id: "a2", files: ["u2/p1/c.jpg"] },
      ],
      error: null,
    });
    await expect(sweepProgramDocuments(admin)).resolves.toBe(3);
    expect(removeFiles).toHaveBeenCalledWith(admin, "program-documents", [
      "u1/p1/a.jpg",
      "u1/p1/b.pdf",
      "u2/p1/c.jpg",
    ]);
  });

  it("does nothing when nothing is due", async () => {
    await expect(
      sweepProgramDocuments(adminReturning({ data: [], error: null }))
    ).resolves.toBe(0);
    expect(removeFiles).not.toHaveBeenCalled();
  });

  it("fails when the database does", async () => {
    await expect(
      sweepProgramDocuments(
        adminReturning({ data: null, error: { message: "boom" } })
      )
    ).rejects.toThrow("sweep_program_documents: boom");
  });
});
