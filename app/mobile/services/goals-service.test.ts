import { createGoal } from "../repositories/goals-repository";

describe("Integration Test: Database Layer (Service -> DB)", () => {
  // 1. Happy Path
  it("should successfully create a new saving goal in database (Happy Path)", async () => {
    const newGoal = {
      id: "test-goal-001",
      name: "Wymarzone wakacje",
      targetAmount: 5000,
      currentAmount: 0,
      deadline: "2027-06-01T12:00:00.000Z",
      createdAt: new Date().toISOString(),
    };
    await createGoal(newGoal);
    expect(newGoal.id).toBeDefined();
    expect(newGoal.name).toBe("Wymarzone wakacje");
    expect(newGoal.targetAmount).toBe(5000);
  });

  // 2. Błędne dane
  it("should throw an error when providing invalid user input", async () => {
    const invalidGoal = {
      id: "test-goal-002",
      currentAmount: 0,
    } as any;
    await expect(createGoal(invalidGoal)).rejects.toThrow();
  });

  // 3. Duplikaty
  it("should throw an error when trying to create a goal with an existing ID", async () => {
    const duplicateGoal = {
      id: "test-goal-duplicate",
      name: "Nowy komputer",
      targetAmount: 8000,
      currentAmount: 0,
      deadline: "2027-12-31T12:00:00.000Z",
      createdAt: new Date().toISOString(),
    };
    // Pierwszy zapis - musi przejść
    await createGoal(duplicateGoal);
    // Drugi zapis tego samego - musi wywalić błąd
    await expect(createGoal(duplicateGoal)).rejects.toThrow();
  });
});
