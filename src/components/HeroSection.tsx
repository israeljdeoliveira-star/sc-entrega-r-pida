import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Clock, MessageCircle, Bike } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import logoFrete from "@/assets/logo-frete-garca.png";

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

  const handleClick = () => {
    trackEvent("button_click", { button: "hero_cta" });
    onSimulateClick();
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--hero-gradient-from))] to-[hsl(var(--hero-gradient-to))]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[hsl(var(--primary-foreground))] blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-[hsl(var(--primary-foreground))] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            <motion.img
              src={logoFrete}
              alt="Frete Garça"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="h-16 sm:h-20 mb-8 mx-auto lg:mx-0 object-contain"
            />

            <h1 className="text-3xl font-extrabold tracking-tight text-[hsl(var(--primary-foreground))] sm:text-4xl lg:text-5xl leading-tight">
              Fretes rápidos e entregas em{" "}
              <span className="inline-block min-w-[180px] text-left">
                <span className="border-r-2 border-[hsl(var(--primary-foreground))] pr-1 animate-pulse">
                  {cityText}
                </span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-6 max-w-lg text-lg text-[hsl(var(--primary-foreground)/0.8)] sm:text-xl lg:mx-0 mx-auto"
            >
              Simule online em segundos e receba o melhor preço para sua entrega via motoboy.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
            >
              <Button
                size="lg"
                onClick={handleClick}
                className="gap-2 bg-[hsl(var(--primary-foreground))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-foreground)/0.9)] font-semibold text-base px-8 py-6 shadow-lg"
              >
                Simular Frete Agora
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                asChild
                variant="outline"
                className="gap-2 border-[hsl(var(--primary-foreground)/0.3)] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-foreground)/0.1)] font-semibold text-base px-8 py-6"
              >
                <a href="https://wa.me/5547999999999" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-5 w-5" />
                  Falar com Atendente
                </a>
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="mt-10 flex flex-wrap items-center gap-6 justify-center lg:justify-start"
            >
              <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--primary-foreground)/0.7)]">
                <Clock className="h-4 w-4" />
                <span>Entrega em até 45 minutos</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--primary-foreground)/0.7)]">
                <Shield className="h-4 w-4" />
                <span>Garantia de entrega</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Floating motoboy card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <div className="relative">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-2xl border border-[hsl(var(--primary-foreground)/0.15)] bg-[hsl(var(--primary-foreground)/0.08)] backdrop-blur-sm p-8"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(var(--primary-foreground)/0.15)]">
                    <Bike className="h-7 w-7 text-[hsl(var(--primary-foreground))]" />
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--primary-foreground)/0.6)]">Simulação rápida</p>
                    <p className="text-xl font-bold text-[hsl(var(--primary-foreground))]">Itapema → Bal. Camboriú</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between rounded-lg bg-[hsl(var(--primary-foreground)/0.06)] px-4 py-3">
                    <span className="text-sm text-[hsl(var(--primary-foreground)/0.7)]">Distância</span>
                    <span className="font-semibold text-[hsl(var(--primary-foreground))]">18 km</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-[hsl(var(--primary-foreground)/0.06)] px-4 py-3">
                    <span className="text-sm text-[hsl(var(--primary-foreground)/0.7)]">Tempo estimado</span>
                    <span className="font-semibold text-[hsl(var(--primary-foreground))]">~25 min</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-[hsl(var(--primary-foreground)/0.1)] px-4 py-3 border border-[hsl(var(--primary-foreground)/0.15)]">
                    <span className="text-sm font-medium text-[hsl(var(--primary-foreground))]">Valor do frete</span>
                    <span className="text-xl font-bold text-[hsl(var(--primary-foreground))]">R$ 35,00</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--primary-foreground)/0.4)]" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary-foreground))]" />
                  </span>
                  <span className="text-xs text-[hsl(var(--primary-foreground)/0.6)]">5 motoboys disponíveis na região</span>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 rounded-xl border border-[hsl(var(--primary-foreground)/0.15)] bg-[hsl(var(--primary-foreground)/0.1)] backdrop-blur-sm px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-6 w-6 rounded-full border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary-foreground)/0.2)]" />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-[hsl(var(--primary-foreground))]">+2.500 entregas</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
