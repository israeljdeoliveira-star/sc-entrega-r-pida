import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

const CITIES = ["Itapema", "Porto Belo", "Tijucas", "Bombinhas", "Bal. Camboriú", "Itajaí"];

function useTypewriter(words: string[], typingSpeed = 80, deletingSpeed = 40, pauseTime = 2000) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && text === current) {
      timeout = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && text === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % words.length);
    } else {
      timeout = setTimeout(() => {
        setText(isDeleting ? current.slice(0, text.length - 1) : current.slice(0, text.length + 1));
      }, isDeleting ? deletingSpeed : typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, wordIndex, words, typingSpeed, deletingSpeed, pauseTime]);

  return text;
}

interface HeroSectionProps {
  onSimulateClick: () => void;
}

export default function HeroSection({ onSimulateClick }: HeroSectionProps) {
  const cityText = useTypewriter(CITIES);
  const [whatsappNumber, setWhatsappNumber] = useState("5547999999999");

  useEffect(() => {
    supabase.from("site_settings").select("whatsapp_number").limit(1).single()
      .then(({ data }) => { if (data) setWhatsappNumber(data.whatsapp_number); });
  }, []);

  const handleClick = () => {
    trackEvent("button_click", { button: "hero_cta" });
    onSimulateClick();
  };

  return (
    <section className="relative overflow-hidden bg-background">
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto"
        >
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-sm sm:text-base text-muted-foreground mb-4 font-medium"
          >
            📍 Somos de Itapema — fretes via motoboy a partir de <span className="text-primary font-bold">R$ 15,00</span>
          </motion.p>

          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl leading-tight">
            Fretes rápidos e entregas Motoboy em{" "}
            <span className="text-primary inline-block min-w-[160px]">
              🏍️ <span className="border-r-2 border-primary pr-1 animate-pulse">{cityText}</span>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg mx-auto"
          >
            Simule online em segundos e receba o melhor preço para sua entrega via motoboy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
          >
            <Button
              size="lg"
              onClick={handleClick}
              className="gap-2 font-semibold text-base px-8 py-5 shadow-lg"
            >
              Simular Frete Agora
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              asChild
              className="gap-2 font-semibold text-base px-8 py-5 text-white"
              style={{ backgroundColor: "hsl(142, 70%, 45%)" }}
            >
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-5 w-5" />
                Falar no WhatsApp
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
