import { useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Clock, Star, Truck } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface HeroSectionProps {
  onSimulateClick: () => void;
}

export default function HeroSection({ onSimulateClick }: HeroSectionProps) {
  const handleClick = () => {
    trackEvent("button_click", { button: "hero_cta" });
    onSimulateClick();
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--hero-gradient-from))] to-[hsl(var(--hero-gradient-to))]">
      {/* Geometric background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[hsl(var(--primary-foreground))] blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-[hsl(var(--primary-foreground))] blur-3xl" />
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-[hsl(var(--primary-foreground))]" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" opacity="0.3" />
        </svg>
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
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--primary-foreground)/0.2)] bg-[hsl(var(--primary-foreground)/0.1)] px-4 py-1.5 text-sm text-[hsl(var(--primary-foreground))]"
            >
              <Zap className="h-3.5 w-3.5" />
              Entrega rápida em todo o Brasil
            </motion.div>

            <h1 className="text-4xl font-extrabold tracking-tight text-[hsl(var(--primary-foreground))] sm:text-5xl lg:text-6xl">
              Frete{" "}
              <span className="relative">
                rápido
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  className="absolute -bottom-1 left-0 h-1 w-full origin-left rounded-full bg-[hsl(var(--primary-foreground)/0.4)]"
                />
              </span>
              ,{" "}
              <span className="relative">
                seguro
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  className="absolute -bottom-1 left-0 h-1 w-full origin-left rounded-full bg-[hsl(var(--primary-foreground)/0.4)]"
                />
              </span>{" "}
              e com o{" "}
              <span className="text-[hsl(var(--primary-foreground))]">melhor preço.</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-6 max-w-lg text-lg text-[hsl(var(--primary-foreground)/0.8)] sm:text-xl lg:mx-0 mx-auto"
            >
              +2.500 entregas realizadas com sucesso. Simule agora e descubra o melhor valor para sua encomenda.
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
                className="gap-2 bg-[hsl(var(--primary-foreground))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-foreground)/0.9)] font-semibold text-base px-8 py-6 shadow-lg shadow-[hsl(var(--hero-gradient-to)/0.3)]"
              >
                Simular Frete Agora
                <ArrowRight className="h-5 w-5" />
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
                <Shield className="h-4 w-4" />
                <span>Seguro total</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--primary-foreground)/0.7)]">
                <Clock className="h-4 w-4" />
                <span>Cotação em segundos</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--primary-foreground)/0.7)]">
                <Star className="h-4 w-4" />
                <span>4.9 de avaliação</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Visual element */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Floating card */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-2xl border border-[hsl(var(--primary-foreground)/0.15)] bg-[hsl(var(--primary-foreground)/0.08)] backdrop-blur-sm p-8"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(var(--primary-foreground)/0.15)]">
                    <Truck className="h-7 w-7 text-[hsl(var(--primary-foreground))]" />
                  </div>
                  <div>
                    <p className="text-sm text-[hsl(var(--primary-foreground)/0.6)]">Simulação rápida</p>
                    <p className="text-xl font-bold text-[hsl(var(--primary-foreground))]">Florianópolis → São Paulo</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between rounded-lg bg-[hsl(var(--primary-foreground)/0.06)] px-4 py-3">
                    <span className="text-sm text-[hsl(var(--primary-foreground)/0.7)]">Distância</span>
                    <span className="font-semibold text-[hsl(var(--primary-foreground))]">705 km</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-[hsl(var(--primary-foreground)/0.06)] px-4 py-3">
                    <span className="text-sm text-[hsl(var(--primary-foreground)/0.7)]">Tempo estimado</span>
                    <span className="font-semibold text-[hsl(var(--primary-foreground))]">~10h</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-[hsl(var(--primary-foreground)/0.1)] px-4 py-3 border border-[hsl(var(--primary-foreground)/0.15)]">
                    <span className="text-sm font-medium text-[hsl(var(--primary-foreground))]">Valor do frete</span>
                    <span className="text-xl font-bold text-[hsl(var(--primary-foreground))]">R$ 485,00</span>
                  </div>
                </div>

                {/* Animated status dots */}
                <div className="mt-6 flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--primary-foreground)/0.4)]" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--primary-foreground))]" />
                  </span>
                  <span className="text-xs text-[hsl(var(--primary-foreground)/0.6)]">3 motoristas disponíveis na região</span>
                </div>
              </motion.div>

              {/* Small floating badge */}
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
                  <span className="text-xs font-medium text-[hsl(var(--primary-foreground))]">+2.500 clientes</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
