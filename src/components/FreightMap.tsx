import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FreightMapProps {
  originCoords: [number, number] | null; // [lat, lng]
  destCoords: [number, number] | null;
  onRouteCalculated?: (distanceKm: number, durationMin: number, routeCoords: [number, number][]) => void;
}

const GREEN_ICON = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const RED_ICON = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function FreightMap({ originCoords, destCoords, onRouteCalculated }: FreightMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-27.1, -48.6], 10);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '',
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers and route
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Clear previous
    if (originMarkerRef.current) { map.removeLayer(originMarkerRef.current); originMarkerRef.current = null; }
    if (destMarkerRef.current) { map.removeLayer(destMarkerRef.current); destMarkerRef.current = null; }
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }

    if (originCoords) {
      originMarkerRef.current = L.marker(originCoords, { icon: GREEN_ICON }).addTo(map).bindPopup("Origem");
    }
    if (destCoords) {
      destMarkerRef.current = L.marker(destCoords, { icon: RED_ICON }).addTo(map).bindPopup("Destino");
    }

    if (originCoords && destCoords) {
      // Fit bounds
      const bounds = L.latLngBounds([originCoords, destCoords]);
      map.fitBounds(bounds, { padding: [40, 40] });

      // Fetch route from OSRM
      const url = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.routes?.[0]) {
            const route = data.routes[0];
            const coords: [number, number][] = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            routeLineRef.current = L.polyline(coords, {
              color: "hsl(210, 80%, 70%)",
              weight: 4,
              opacity: 0.85,
            }).addTo(map);
            map.fitBounds(routeLineRef.current.getBounds(), { padding: [40, 40] });

            const distKm = route.distance / 1000;
            const durMin = route.duration / 60;
            onRouteCalculated?.(distKm, durMin, coords);
          }
        })
        .catch(() => {});
    } else if (originCoords) {
      map.setView(originCoords, 14);
    } else if (destCoords) {
      map.setView(destCoords, 14);
    }
  }, [originCoords, destCoords, mapReady]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[250px] rounded-xl overflow-hidden border"
      style={{ zIndex: 0 }}
    />
  );
}
