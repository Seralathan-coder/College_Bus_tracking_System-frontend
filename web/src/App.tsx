import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import AdminDashboard from "./pages/admin/Dashboard";
import BusesPage from "./pages/admin/Buses";
import DriversPage from "./pages/admin/Drivers";
import StudentsPage from "./pages/admin/Students";
import RoutesPage from "./pages/admin/Routes";
import TripHistoryPage from "./pages/admin/TripHistory";
import DriverDashboard from "./pages/driver/Dashboard";
import LiveTrip from "./pages/driver/LiveTrip";
import StudentDashboard from "./pages/student/Dashboard";
import StudentTracking from "./pages/student/Tracking";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            element={
              <ProtectedRoute roles={["ADMIN", "DRIVER", "STUDENT"]}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route
              path="/admin"
              element={<ProtectedRoute roles={["ADMIN"]}><AdminDashboard /></ProtectedRoute>}
            />
            <Route path="/admin/buses" element={<ProtectedRoute roles={["ADMIN"]}><BusesPage /></ProtectedRoute>} />
            <Route path="/admin/drivers" element={<ProtectedRoute roles={["ADMIN"]}><DriversPage /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute roles={["ADMIN"]}><StudentsPage /></ProtectedRoute>} />
            <Route path="/admin/routes" element={<ProtectedRoute roles={["ADMIN"]}><RoutesPage /></ProtectedRoute>} />
            <Route path="/admin/trips" element={<ProtectedRoute roles={["ADMIN"]}><TripHistoryPage /></ProtectedRoute>} />
            <Route path="/driver" element={<ProtectedRoute roles={["DRIVER"]}><DriverDashboard /></ProtectedRoute>} />
            <Route path="/driver/trip" element={<ProtectedRoute roles={["DRIVER"]}><LiveTrip /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute roles={["STUDENT"]}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/student/tracking" element={<ProtectedRoute roles={["STUDENT"]}><StudentTracking /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
