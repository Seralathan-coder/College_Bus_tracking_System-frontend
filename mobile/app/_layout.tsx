import "text-encoding";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

function Gate() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === "login" || segments[0] === "signup";
    if (!user && !inAuth) {
      router.replace("/login");
    } else if (user && (inAuth || segments.length === 0)) {
      if (user.role === "DRIVER") router.replace("/driver");
      else router.replace("/student");
    }
  }, [user, ready, segments, router]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
