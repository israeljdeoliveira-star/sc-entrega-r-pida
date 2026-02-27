import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const GOOGLE_REVIEWS_URL = "https://g.page/frete-garca/review";

const REVIEWS = [
  {
    name: "Maria S.",
    city: "Itapema",
    rating: 5,
    text: "Serviço excelente! Minha encomenda chegou em menos de 30 minutos. Super recomendo!",
  },
  {
    name: "Carlos R.",
    city: "Bal. Camboriú",
    rating: 5,
    text: "Preço justo e entrega rápida. Uso sempre para enviar documentos entre cidades.",
  },
  {
    name: "Ana P.",
    city: "Porto Belo",
    rating: 5,
    text: "Motoboy muito educado e pontual. A melhor opção de frete da região!",
  },
  {
    name: "João M.",
    city: "Tijucas",
    rating: 5,
    text: "Entrega garantida e sem dor de cabeça. Já indiquei para todos os meus amigos.",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function SocialProof() {
  return (
    <section className="py-16 bg-background" id="reviews">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-10">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 mb-4 hover:bg-accent/80 transition-colors cursor-pointer"
          >
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold">4.9 ★ no Google — Clique para avaliar</span>
          </a>
          <h2 className="text-2xl font-bold sm:text-3xl">O que nossos clientes dizem</h2>
          <p className="mt-2 text-muted-foreground">Avaliações reais de quem já usou nosso serviço</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REVIEWS.map((review, i) => (
            <a
              key={i}
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:scale-[1.02] transition-transform"
            >
              <Card className="border shadow-sm hover:shadow-md transition-shadow h-full">
                <CardContent className="pt-6 space-y-3">
                  <StarRating rating={review.rating} />
                  <p className="text-sm text-muted-foreground leading-relaxed">"{review.text}"</p>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-semibold">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.city}</p>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
