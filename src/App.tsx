import { Routes, Route, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthProvider from "./auth/AuthProvider";
import Home from "./pages/Home";
import Services from "./pages/Services";
import VipExperience from "./pages/VipExperience";
import Loyalty from "./pages/Loyalty";
import PointsTable from "./pages/PointsTable";
import About from "./pages/About";
import Booking from "./pages/Booking";
import Contact from "./pages/Contact";

// Las pantallas de RED CLUB se cargan bajo demanda: quien solo navega
// el sitio público no debe descargar el código del club.
const Login = lazy(() => import("./pages/club/Login"));
const Register = lazy(() => import("./pages/club/Register"));
const ForgotPassword = lazy(() => import("./pages/club/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/club/ResetPassword"));
const AuthCallback = lazy(() => import("./pages/club/AuthCallback"));
const Account = lazy(() => import("./pages/club/Account"));

// El panel administrativo se carga aparte: solo lo descarga quien
// realmente entra a /admin (y solo tras confirmar que es admin).
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminBookings = lazy(() => import("./pages/admin/Bookings"));
const AdminClients = lazy(() => import("./pages/admin/Clients"));
const AdminServices = lazy(() => import("./pages/admin/Services"));
const AdminSchedules = lazy(() => import("./pages/admin/Schedules"));
const AdminBarbers = lazy(() => import("./pages/admin/Barbers"));

// Panel del barbero: mismo criterio, solo lo descarga quien tiene
// rol barber o admin.
const BarberPanel = lazy(() => import("./pages/staff/BarberPanel"));

function RouteFallback() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center bg-obsidian">
      <FaSpinner className="animate-spin text-2xl text-gold" aria-label="Cargando" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Las pantallas de autenticación se muestran a pantalla completa, sin
 * el navbar ni el footer del sitio público. */
const BARE_ROUTES = [
  "/club/entrar",
  "/club/registro",
  "/club/recuperar",
  "/club/restablecer",
  "/club/callback",
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const isBare = BARE_ROUTES.includes(pathname);

  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <ScrollToTop />
      {!isBare && <Navbar onMenuOpenChange={setMenuOpen} />}
      <main>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Sitio público */}
          <Route path="/" element={<Home />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/experiencia-vip" element={<VipExperience />} />
          <Route path="/fidelizacion" element={<Loyalty />} />
          <Route path="/puntos" element={<PointsTable />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/contacto" element={<Contact />} />

          {/* Autenticación RED CLUB */}
          <Route path="/club/entrar" element={<Login />} />
          <Route path="/club/registro" element={<Register />} />
          <Route path="/club/recuperar" element={<ForgotPassword />} />
          <Route path="/club/restablecer" element={<ResetPassword />} />
          <Route path="/club/callback" element={<AuthCallback />} />

          {/* RED CLUB (requiere sesión) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/club" element={<Account />} />
          </Route>

          {/* Panel administrativo (requiere sesión + role='admin') */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="reservas" element={<AdminBookings />} />
              <Route path="clientes" element={<AdminClients />} />
              <Route path="servicios" element={<AdminServices />} />
              <Route path="horarios" element={<AdminSchedules />} />
              <Route path="barberos" element={<AdminBarbers />} />
            </Route>
          </Route>

          {/* Panel del barbero (requiere sesión + role='barber' o 'admin') */}
          <Route element={<ProtectedRoute requireStaff />}>
            <Route path="/barbero" element={<BarberPanel />} />
          </Route>
        </Routes>
        </Suspense>
      </main>
      {!isBare && <Footer />}
      {!isBare && <WhatsAppButton hidden={menuOpen} />}
    </div>
  );
}

/** AuthProvider envuelve toda la app para que la sesión esté disponible
 * en cualquier ruta, incluido el formulario de reservas. */
export default function AppWithProviders() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
