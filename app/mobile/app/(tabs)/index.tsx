import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, TextInput } from "react-native";

import { Text, View } from "@/components/Themed";
import { Button, ButtonText } from "@/components/ui/button";
import {
  createTodo,
  deleteTodo,
  getAllTodos,
  toggleTodo,
  type Todo,
} from "@/db/todos";

export default function TabOneScreen() {
  const [title, setTitle] = useState("");
  const [todos, setTodos] = useState<Todo[]>(() => getAllTodos());

  const handleAddTodo = useCallback(() => {
    const value = title.trim();
    if (!value) return;
    const next = createTodo({ title: value });
    setTodos(next);
    setTitle("");
  }, [title]);

  const handleToggleTodo = useCallback((item: Todo) => {
    if (!item.id) return;
    const next = toggleTodo(item.id, !item.completed);
    setTodos(next);
  }, []);

  const handleDeleteTodo = useCallback((item: Todo) => {
    if (!item.id) return;
    const next = deleteTodo(item.id);
    setTodos(next);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Local tasks</Text>
      <Text style={styles.subtitle}>
        Data lives inside the on-device SQLite database managed by Drizzle ORM.
      </Text>
      <View style={styles.form}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Add something to do"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          returnKeyType="done"
          onSubmitEditing={handleAddTodo}
        />
        <Button onPress={handleAddTodo} disabled={!title.trim()}>
          <ButtonText>Add</ButtonText>
        </Button>
      </View>
      <FlatList
        data={todos}
        keyExtractor={(item) => (item.id ? String(item.id) : item.title)}
        style={styles.list}
        contentContainerStyle={
          todos.length === 0 ? styles.emptyListContainer : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleToggleTodo(item)}
            onLongPress={() => handleDeleteTodo(item)}
            style={[styles.card, item.completed && styles.cardCompleted]}
          >
            <Text
              style={[styles.cardTitle, item.completed && styles.cardTitleDone]}
            >
              {item.title}
            </Text>
            <Text style={styles.cardMeta}>
              {item.completed
                ? "Completed"
                : "Tap to toggle • long press to delete"}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyCopy}>
            No tasks yet. Add your first one!
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    paddingTop: 48,
    paddingHorizontal: 16,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    color: "#475569",
    marginBottom: 8,
  },
  form: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  emptyListContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(15,23,42,0.05)",
    marginBottom: 12,
  },
  cardCompleted: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardTitleDone: {
    textDecorationLine: "line-through",
    color: "#22c55e",
  },
  cardMeta: {
    marginTop: 4,
    color: "#475569",
    fontSize: 12,
  },
  emptyCopy: {
    textAlign: "center",
    color: "#94a3b8",
  },
});
