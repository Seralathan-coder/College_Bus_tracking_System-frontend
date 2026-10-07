import { NavLink, Outlet } from "react-router-dom";
import { homeForRole, useAuth } from "../context/AuthContext";
import { BusBrand } from "./BusBrand";

const links = {
  ADMIN: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/buses", label: "Buses" },
    { to: "/admin/drivers", label: "Drivers" },
    { to: "/admin/students", label: "Students" },
    { to: "/admin/routes", label: "Routes" },
    { to: "/admin/trips", label: "Trip history" },
  ],
  DRIVER: [
    { to: "/driver", label: "Dashboard" },
    { to: "/driver/trip", label: "Live trip" },
  ],
  STUDENT: [
    { to: "/student", label: "Dashboard" },
    { to: "/student/tracking", label: "Live tracking" },
  ],
};

export function AppShell() {
  const { user, logout } = useAuth();
  if (!user) {
    return null;
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <BusBrand />
        <p className="muted">{user.name}</p>
        <nav>
          {links[user.role].map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === homeForRole(user.role)}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button className="secondary" onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
