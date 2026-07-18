import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsAppButton from "./components/WhatsAppButton";
import Home from "./pages/Home";
import Services from "./pages/Services";
import VipExperience from "./pages/VipExperience";
import Loyalty from "./pages/Loyalty";
import About from "./pages/About";
import Booking from "./pages/Booking";
import Contact from "./pages/Contact";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

function App() {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/servicios" element={<Services />} />
          <Route path="/experiencia-vip" element={<VipExperience />} />
          <Route path="/fidelizacion" element={<Loyalty />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/reservar" element={<Booking />} />
          <Route path="/contacto" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}

export default App;
