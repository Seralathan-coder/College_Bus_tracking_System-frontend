import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Link, useRouter } from "expo-router";
import { ErrorText, Screen, Title } from "../src/components/Ui";
import { getErrorMessage } from "../src/api/client";
import { useAuth } from "../src/context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("student@college.edu");
  const [password, setPassword] = useState("Student@123");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    try {
      const user = await login(email, password);
      router.replace(user.role === "DRIVER" ? "/driver" : "/student");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Screen>
      <Title text="College Bus Tracking" />
      <ErrorText message={error} />
      <TextInput style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" />
      <Pressable style={styles.button} onPress={submit}><Text style={styles.buttonText}>Sign in</Text></Pressable>
      <Link href="/signup">Create student account</Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: "#0f2744", padding: 14, borderRadius: 8, alignItems: "center", marginVertical: 8 },
  buttonText: { color: "white", fontWeight: "700" },
});
