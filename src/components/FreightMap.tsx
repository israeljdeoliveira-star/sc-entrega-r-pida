import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface FreightMapProps {
  originCoords: [number, number] | null;
  destCoords: [number, number] | null;
  extraStopCoords?: [number, number][];
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

function createNumberedIcon(number: number): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      background: hsl(217, 91%, 60%);
      color: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 13px;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${number}</div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Animated vehicle marker icon
const VEHICLE_ICON = L.divIcon({
  html: `<div style="font-size:24px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));animation:bounce 0.6s ease-in-out infinite alternate;">🛵</div>`,
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export default function FreightMap({ originCoords, destCoords, extraStopCoords = [], onRouteCalculated }: FreightMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const animatedLineRef = useRef<L.Polyline | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const animationRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Inject bounce keyframes
    if (!document.getElementById("freight-map-styles")) {
      const style = document.createElement("style");
      style.id = "freight-map-styles";
      style.textContent = `@keyframes bounce{0%{transform:translateY(0)}100%{transform:translateY(-6px)}}`;
      document.head.appendChild(style);
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([-27.09, -48.61], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
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

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const clearAnimation = () => {
    if (animationRef.current) { cancelAnimationFrame(animationRef.current); animationRef.current = null; }
    if (animatedLineRef.current && mapRef.current) { mapRef.current.removeLayer(animatedLineRef.current); animatedLineRef.current = null; }
    if (vehicleMarkerRef.current && mapRef.current) { mapRef.current.removeLayer(vehicleMarkerRef.current); vehicleMarkerRef.current = null; }
  };

  const animateRoute = (coords: [number, number][]) => {
    if (!mapRef.current || coords.length < 2) return;
    clearAnimation();

    const map = mapRef.current;

    animatedLineRef.current = L.polyline([], {
      color: "hsl(200, 100%, 50%)",
      weight: 5,
      opacity: 1,
    }).addTo(map);

    vehicleMarkerRef.current = L.marker(coords[0], { icon: VEHICLE_ICON, zIndexOffset: 1000 }).addTo(map);

    const totalPoints = coords.length;
    const step = Math.max(1, Math.floor(totalPoints / 200));
    let currentIndex = 0;
    const startTime = performance.now();
    const duration = Math.min(4000, Math.max(2000, totalPoints * 5));

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const targetIndex = Math.floor(progress * (totalPoints - 1));

      if (targetIndex > currentIndex) {
        const newPoints: L.LatLngExpression[] = [];
        for (let i = currentIndex; i <= targetIndex; i += step) {
          newPoints.push(coords[i]);
        }
        newPoints.push(coords[targetIndex]);

        if (animatedLineRef.current) {
          const existing = animatedLineRef.current.getLatLngs() as L.LatLng[];
          animatedLineRef.current.setLatLngs([...existing, ...newPoints]);
        }

        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng(coords[targetIndex]);
        }

        currentIndex = targetIndex;
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (animatedLineRef.current) {
          animatedLineRef.current.setLatLngs(coords);
        }
        if (vehicleMarkerRef.current) {
          vehicleMarkerRef.current.setLatLng(coords[coords.length - 1]);
          setTimeout(() => {
            if (vehicleMarkerRef.current && mapRef.current) {
              mapRef.current.removeLayer(vehicleMarkerRef.current);
              vehicleMarkerRef.current = null;
            }
          }, 2000);
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Clear all markers & routes
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }
    clearAnimation();

    if (originCoords) {
      markersRef.current.push(L.marker(originCoords, { icon: GREEN_ICON }).addTo(map).bindPopup("Origem"));
    }
    if (destCoords) {
      markersRef.current.push(L.marker(destCoords, { icon: RED_ICON }).addTo(map).bindPopup("Destino"));
    }
    // Numbered stop markers
    extraStopCoords.forEach((coords, i) => {
      markersRef.current.push(
        L.marker(coords, { icon: createNumberedIcon(i + 1) })
          .addTo(map)
          .bindPopup(`Parada ${i + 1}`)
      );
    });

    const allPoints = [originCoords, ...extraStopCoords, destCoords].filter(Boolean) as [number, number][];

    if (originCoords && destCoords) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [30, 30] });

      const waypoints = [originCoords, ...extraStopCoords, destCoords];
      const coordsStr = waypoints.map(c => `${c[1]},${c[0]}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          if (data.routes?.[0]) {
            const route = data.routes[0];
            const coords: [number, number][] = route.geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]] as [number, number]
            );
            routeLineRef.current = L.polyline(coords, {
              color: "hsl(45, 80%, 75%)",
              weight: 4,
              opacity: 0.5,
              dashArray: "8 6",
            }).addTo(map);
            map.fitBounds(routeLineRef.current.getBounds(), { padding: [30, 30] });

            animateRoute(coords);

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
  }, [originCoords, destCoords, extraStopCoords, mapReady]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[300px] rounded-xl overflow-hidden border"
      style={{ zIndex: 0 }}
    />
  );
}
