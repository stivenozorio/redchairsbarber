import { FaWhatsapp } from "react-icons/fa";
import { WHATSAPP_LINK } from "../data/site";

/** Para quien no quiere (o no puede) crear una cuenta de RED CLUB
 * para reservar — texto y destino iguales en todo el sitio (Inicio,
 * Servicios, Registro), a propósito: un solo botón reconocible. */
export default function WhatsAppBookingButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn-outline flex items-center justify-center gap-2 ${className}`}
    >
      <FaWhatsapp size={14} />
      Reservar por WhatsApp, sin cuenta
    </a>
  );
}
