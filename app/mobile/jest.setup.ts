type AlertRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: number;
  createdAt: string;
  relatedId: string | null;
};

type TransactionRow = {
  id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  type: string;
  createdAt: string;
  source: string | null;
};

const state = {
  alerts: [] as AlertRow[],
  transactions: [] as TransactionRow[],
};

function normalizeSql(source: string): string {
  return source.trim().replace(/\s+/g, " ").toLowerCase();
}

class MockSQLiteDatabase {
  runSync(source: string, ...params: any[]) {
    const sql = normalizeSql(source);

    if (
      sql.startsWith("create table") ||
      sql.startsWith("alter table") ||
      sql.startsWith("begin") ||
      sql.startsWith("commit") ||
      sql.startsWith("rollback")
    ) {
      return { lastInsertRowId: 0, changes: 0 };
    }

    if (sql === "delete from alerts") {
      const changes = state.alerts.length;
      state.alerts = [];
      return { lastInsertRowId: 0, changes };
    }

    if (sql === "delete from transactions_store") {
      const changes = state.transactions.length;
      state.transactions = [];
      return { lastInsertRowId: 0, changes };
    }

    if (sql.startsWith("insert into alerts")) {
      const [id, type, title, message, read, createdAt, relatedId] = params;
      state.alerts.push({
        id,
        type,
        title,
        message,
        read: Number(read),
        createdAt,
        relatedId: relatedId ?? null,
      });

      return { lastInsertRowId: 0, changes: 1 };
    }

    if (sql.startsWith("update alerts set read = 1 where id = ?")) {
      const [id] = params;
      let changes = 0;

      state.alerts = state.alerts.map((alert) => {
        if (alert.id !== id) {
          return alert;
        }

        changes += 1;
        return { ...alert, read: 1 };
      });

      return { lastInsertRowId: 0, changes };
    }

    if (sql.startsWith("insert into transactions_store")) {
      const [id, amount, description, date, category, type, createdAt, source] =
        params;

      state.transactions.push({
        id,
        amount: Number(amount),
        description,
        date,
        category,
        type,
        createdAt,
        source: source ?? null,
      });

      return { lastInsertRowId: 0, changes: 1 };
    }

    if (sql.startsWith("update transactions_store set category = ? where id = ?")) {
      const [category, id] = params;
      let changes = 0;

      state.transactions = state.transactions.map((transaction) => {
        if (transaction.id !== id) {
          return transaction;
        }

        changes += 1;
        return { ...transaction, category };
      });

      return { lastInsertRowId: 0, changes };
    }

    if (sql.startsWith("delete from transactions_store where id = ?")) {
      const [id] = params;
      const before = state.transactions.length;
      state.transactions = state.transactions.filter(
        (transaction) => transaction.id !== id,
      );
      return { lastInsertRowId: 0, changes: before - state.transactions.length };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  getAllSync<T>(source: string, ...params: any[]): T[] {
    const sql = normalizeSql(source);

    if (sql.includes("from alerts") && sql.includes("where read = 0")) {
      const unreadAlerts = state.alerts
        .filter((alert) => alert.read === 0)
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .map((alert) => ({
          id: alert.id,
          type: alert.type,
          title: alert.title,
          message: alert.message,
          read: alert.read,
          createdAt: alert.createdAt,
          relatedId: alert.relatedId,
        }));

      return unreadAlerts as T[];
    }

    if (sql.includes("from transactions_store")) {
      const transactions = state.transactions
        .slice()
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        )
        .map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          category: transaction.category,
          type: transaction.type,
          createdAt: transaction.createdAt,
          source: transaction.source,
        }));

      return transactions as T[];
    }

    if (
      sql.includes("from alerts") &&
      sql.includes("where related_id = ? and read = 0")
    ) {
      const [relatedId] = params;
      return state.alerts
        .find((alert) => alert.relatedId === relatedId && alert.read === 0)
        ? ([{ id: "match" }] as T[])
        : ([] as T[]);
    }

    return [] as T[];
  }

  getFirstSync<T>(source: string, ...params: any[]): T | null {
    const rows = this.getAllSync<T>(source, ...params);
    return rows.length > 0 ? rows[0] : null;
  }
}

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => new MockSQLiteDatabase()),
}));