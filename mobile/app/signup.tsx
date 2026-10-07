import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ErrorText, Screen, Title } from "../src/components/Ui";
import { authApi } from "../src/api/endpoints";
import { getErrorMessage } from "../src/api/client";

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    try {
      await authApi.signup(name, email, password);
      router.replace("/login");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Screen>
      <Title text="Student signup" />
      <ErrorText message={error} />
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
      <TextInput style={styles.input} autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="Email" />
      <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" />
      <Pressable style={styles.button} onPress={submit}><Text style={styles.buttonText}>Create account</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: "white", borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: "#0f2744", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "700" },
});
