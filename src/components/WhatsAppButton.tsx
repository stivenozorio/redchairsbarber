import { FaWhatsapp } from "react-icons/fa";
import { WHATSAPP_LINK } from "../data/site";

export default function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-obsidian shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-110"
    >
      <FaWhatsapp size={28} />
    </a>
  );
}
