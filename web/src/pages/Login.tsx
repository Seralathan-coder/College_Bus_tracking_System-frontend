import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { ErrorBanner } from "../components/Ui";
import { BusBrand } from "../components/BusBrand";
import { homeForRole, useAuth } from "../context/AuthContext";
import type { Role } from "../types";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password, role);
      navigate(homeForRole(user.role));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={onSubmit}>
        <BusBrand />
        <h1 className="auth-card__title">Bus tracking made simple</h1>
        <p className="muted">Sign in to continue</p>
        <ErrorBanner message={error} />
        <label>
          Sign in as
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="STUDENT">Student</option>
            <option value="DRIVER">Driver</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p>
          Student? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
