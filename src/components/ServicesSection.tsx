import { Package, UtensilsCrossed, Key, FileText, Smartphone, Truck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  {
    icon: Package,
    title: "Coleta de Pacotes Mercado Livre e Shopee",
    description: "Coletamos seus pacotes do Mercado Livre e Shopee direto no endereço de origem e levamos até o ponto de postagem ou destino final.",
  },
  {
    icon: UtensilsCrossed,
    title: "Entrega de Lanches e Refeições",
    description: "Transporte rápido de alimentos com cuidado especial para manter a qualidade. Ideal para restaurantes, lanchonetes e dark kitchens.",
  },
  {
    icon: Key,
    title: "Entrega de Chaves",
    description: "Entrega segura e urgente de chaves para imobiliárias, construtoras e proprietários em toda a região.",
  },
  {
    icon: FileText,
    title: "Entrega de Documentos e Papéis",
    description: "Transporte seguro de documentos, contratos e correspondências com rastreamento em tempo real.",
  },
  {
    icon: Smartphone,
    title: "Entrega de Celulares e Eletrônicos",
    description: "Motoboys treinados para transporte seguro de aparelhos eletrônicos com todo cuidado necessário.",
  },
  {
    icon: Truck,
    title: "Coleta e Entrega Geral",
    description: "Serviço completo de coleta e entrega para qualquer tipo de encomenda na região. Rápido, seguro e com preço justo.",
  },
];

export default function ServicesSection() {
  return (
    <section className="py-16 bg-muted/30" id="servicos">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Serviços de Motoboy em Itapema, Porto Belo e Região
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Oferecemos diversos serviços de entrega rápida por motoboy. Confira as opções disponíveis para sua necessidade.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.title} className="border shadow-sm hover:shadow-md transition-shadow bg-card">
              <CardContent className="pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent mb-4">
                  <service.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold">{service.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
