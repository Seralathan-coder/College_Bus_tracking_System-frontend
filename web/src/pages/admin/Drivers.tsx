import { useEffect, useState, type FormEvent } from "react";
import { getErrorMessage } from "../../api/client";
import { adminApi } from "../../api/endpoints";
import { ErrorBanner } from "../../components/Ui";
import type { User } from "../../types";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setDrivers(await adminApi.drivers());
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await adminApi.createDriver({ name, email, password });
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <h2>Drivers</h2>
      <ErrorBanner message={error} />
      <form className="card row" onSubmit={onCreate}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        <button type="submit">Create driver</button>
      </form>
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th></tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id}><td>{driver.name}</td><td>{driver.email}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
