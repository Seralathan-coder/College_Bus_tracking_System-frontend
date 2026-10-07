import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { Loading } from "../src/components/Ui";

export default function Index() {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Redirect href="/login" />;
  if (user.role === "DRIVER") return <Redirect href="/driver" />;
  return <Redirect href="/student" />;
}
