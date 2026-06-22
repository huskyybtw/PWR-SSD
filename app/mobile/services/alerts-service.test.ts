import { createAlert } from "../repositories/alerts-repository";

// MOCKOWANIE: Oszukujemy aplikację, żeby testy nie szukały fizycznego telefonu z Androidem/iOS
const mockDbStore: any[] = [];
jest.mock("@/shared/client", () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    all: jest.fn(() => mockDbStore),
    where: jest.fn().mockReturnThis(),
    get: jest.fn(() => (mockDbStore.length > 0 ? mockDbStore[0] : undefined)),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    values: jest.fn((val) => {
      mockDbStore.push(val);
      return { run: jest.fn() };
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
      id: "test-alert-001",
      type: "goal_achieved",
      title: "Wielki Sukces!",
      message: "Udało Ci się odłożyć na nowy komputer.",
      read: false,
      createdAt: new Date().toISOString(),
    };

    await expect(createAlert(newAlert)).resolves.not.toThrow();
  });

  // 2. Invalid Input - Błędne/Niekompletne dane
  it("should throw an error when providing invalid alert input", async () => {
    const invalidAlert = {
      id: "test-alert-002",
      read: false,
    } as any;

    await expect(createAlert(invalidAlert)).rejects.toThrow();
  });
});
