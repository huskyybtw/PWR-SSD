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
      // Chaining structure to support .returning().get() and fallback .run()
      return {
        run: jest.fn(),
        returning: jest.fn().mockReturnThis(),
        get: jest.fn(() => val), // Returns the simulated database payload record directly
      };
    }),
    run: jest.fn(),
  },
}));

describe("Integration Test: Alerts Layer", () => {
  beforeEach(() => {
    mockDbStore.length = 0;
  });

  // 1. Happy Path - Prawidłowe dane
  it("should successfully create a new alert (Happy Path)", async () => {
    const newAlert = {
      type: "goal_achieved" as const,
      title: "Wielki Sukces!",
      message: "Udało Ci się odłożyć na nowy komputer.",
    };

    await expect(createAlert(newAlert)).resolves.not.toThrow();

    // Additional sanity check: ensure it returns our database object properties
    const result = await createAlert(newAlert);
    expect(result.title).toBe("Wielki Sukces!");
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
    expect(result.read).toBe(false);
  });

  // 2. Invalid Input - Błędne/Niekompletne dane
  it("should throw an error when providing invalid alert input", async () => {
    const invalidAlert = {
      read: false,
    } as any;

    await expect(createAlert(invalidAlert)).rejects.toThrow();
  });
});
