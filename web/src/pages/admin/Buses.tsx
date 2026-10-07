import { useEffect, useState, type FormEvent } from "react";
import { getErrorMessage } from "../../api/client";
import { adminApi } from "../../api/endpoints";
import { ErrorBanner, StatusBadge } from "../../components/Ui";
import type { Bus, User } from "../../types";

export default function BusesPage() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [busNumber, setBusNumber] = useState("");
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [busList, driverList] = await Promise.all([adminApi.buses(), adminApi.drivers()]);
    setBuses(busList);
    setDrivers(driverList);
  }

  useEffect(() => {
    load().catch((err) => setError(getErrorMessage(err)));
  }, []);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    try {
      await adminApi.createBus(busNumber, driverId ? Number(driverId) : undefined);
      setBusNumber("");
      setDriverId("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <h2>Buses</h2>
      <ErrorBanner message={error} />
      <form className="card row" onSubmit={onCreate}>
        <input placeholder="Bus number" value={busNumber} onChange={(e) => setBusNumber(e.target.value)} required />
        <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">Assign driver later</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
        <button type="submit">Add bus</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Number</th>
            <th>Driver</th>
            <th>Status</th>
            <th>Last updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {buses.map((bus) => (
            <tr key={bus.id}>
              <td>{bus.busNumber}</td>
              <td>{bus.driverName ?? "—"}</td>
              <td><StatusBadge status={bus.status} /></td>
              <td>{bus.lastUpdated ? new Date(bus.lastUpdated).toLocaleString() : "—"}</td>
              <td>
                <button className="danger" onClick={() => adminApi.deleteBus(bus.id).then(load)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
