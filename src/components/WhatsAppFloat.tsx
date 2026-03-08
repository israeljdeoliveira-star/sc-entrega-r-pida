import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pushGA4Event, trackEvent } from "@/lib/analytics";

export default function WhatsAppFloat() {
  const [whatsappNumber, setWhatsappNumber] = useState("5547999999999");
  const [show, setShow] = useState(true);

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("whatsapp_number, show_whatsapp_button")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setWhatsappNumber(data.whatsapp_number);
          setShow(data.show_whatsapp_button);
        }
      });
  }, []);

  if (!show) return null;

  const handleClick = () => {
    pushGA4Event("click_whatsapp", { source: "float_button" });
    trackEvent("click_whatsapp", { source: "float_button" });
    window.open(`https://wa.me/${whatsappNumber}`, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 cursor-pointer border-0"
      style={{ backgroundColor: "hsl(142, 70%, 45%)" }}
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="h-7 w-7 text-white" />
    </button>
  );
}
