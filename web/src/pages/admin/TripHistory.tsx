import { useEffect, useState } from "react";
import { getErrorMessage } from "../../api/client";
import { adminApi } from "../../api/endpoints";
import { ErrorBanner, EmptyState, StatusBadge } from "../../components/Ui";
import type { Trip } from "../../types";

export default function TripHistoryPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.trips().then(setTrips).catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div>
      <h2>Trip history</h2>
      <ErrorBanner message={error} />
      {trips.length === 0 ? (
        <EmptyState text="No trips recorded." />
      ) : (
        <table>
          <thead>
            <tr>
              <th>Bus</th>
              <th>Route</th>
              <th>Driver</th>
              <th>Started</th>
              <th>Ended</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
              <tr key={trip.id}>
                <td>{trip.busNumber}</td>
                <td>{trip.routeName}</td>
                <td>{trip.driverName}</td>
                <td>{new Date(trip.startedAt).toLocaleString()}</td>
                <td>{trip.endedAt ? new Date(trip.endedAt).toLocaleString() : "—"}</td>
                <td><StatusBadge status={trip.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
