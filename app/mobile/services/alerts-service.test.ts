import { createAlert } from "../repositories/alerts-repository";

const mockDbStore: any[] = [];
jest.mock("@/shared/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    all: jest.fn(() => mockDbStore),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(() =>
      mockDbStore.length > 0 ? mockDbStore[mockDbStore.length - 1] : undefined,
    ),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    values: jest.fn((val) => {
      mockDbStore.push(val);
      return {
        run: jest.fn(),
        returning: jest.fn().mockReturnThis(),
        get: jest.fn(() => val), 
      };
    }),
    run: jest.fn(),
  },
}));

describe("Integration Test: Alerts Layer", () => {
  beforeEach(() => {
    mockDbStore.length = 0;
  });

  it("should successfully create a new alert (Happy Path)", async () => {
    const newAlert = {
      type: "goal_achieved" as const,
      title: "Wielki Sukces!",
      message: "Udało Ci się odłożyć na nowy komputer.",
    };

    await expect(createAlert(newAlert)).resolves.not.toThrow();

    const result = await createAlert(newAlert);
    expect(result.title).toBe("Wielki Sukces!");
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(result.read).toBe(false);
  });

  it("should throw an error when providing invalid alert input", async () => {
    const invalidAlert = {
      read: false,
    } as any;

    await expect(createAlert(invalidAlert)).rejects.toThrow();
  });
});
