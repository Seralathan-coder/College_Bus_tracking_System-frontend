import { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Title({ text }: { text: string }) {
  return <Text style={styles.title}>{text}</Text>;
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function Loading() {
  return <ActivityIndicator style={{ marginTop: 24 }} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f6f8", padding: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f2744", marginBottom: 12 },
  error: { color: "#b42318", marginBottom: 8 },
});
