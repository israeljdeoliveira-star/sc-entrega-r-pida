import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

interface ServicePhoto {
  id: string;
  title: string;
  image_url: string;
  sort_order: number;
}

export default function ServicePhotosCarousel() {
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);

  useEffect(() => {
    supabase
      .from("service_photos" as any)
      .select("id, title, image_url, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setPhotos(data as any);
      });
  }, []);

  if (photos.length === 0) return null;

  return (
    <section className="py-16 bg-muted/50" id="gallery">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold sm:text-3xl">Nossos Serviços em Ação</h2>
          <p className="mt-2 text-muted-foreground">Veja como fazemos suas entregas com excelência</p>
        </div>
        <div className="relative px-12">
          <Carousel opts={{ align: "start", loop: true }}>
            <CarouselContent>
              {photos.map((photo) => (
                <CarouselItem key={photo.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <img
                      src={photo.image_url}
                      alt={photo.title || "Serviço Frete Garça"}
                      className="w-full h-56 object-cover"
                      loading="lazy"
                    />
                    {photo.title && (
                      <div className="p-3">
                        <p className="text-sm font-medium text-center">{photo.title}</p>
                      </div>
                    )}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
