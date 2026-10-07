import { useEffect, useState } from "react";
import { getErrorMessage } from "../../api/client";
import { adminApi } from "../../api/endpoints";
import { ErrorBanner, EmptyState } from "../../components/Ui";
import type { User } from "../../types";

export default function StudentsPage() {
  const [students, setStudents] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.students().then(setStudents).catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <div>
      <h2>Students</h2>
      <ErrorBanner message={error} />
      {students.length === 0 ? (
        <EmptyState text="No students yet." />
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th></tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}><td>{student.name}</td><td>{student.email}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
