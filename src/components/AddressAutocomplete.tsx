import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city_district?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

export interface AddressSelection {
  street: string;
  houseNumber: string;
  neighborhood: string;
  lat: number;
  lng: number;
  displayText: string;
  cityName?: string;
}

interface AddressAutocompleteProps {
  cityName?: string;
  state?: string;
  placeholder?: string;
  disabled?: boolean;
  value?: string;
  requireNumber?: boolean;
  onSelect: (selection: AddressSelection) => void;
}

function extractNumberFromInput(input: string): string {
  const match = input.match(/,\s*(\d+)/);
  return match ? match[1] : "";
}

function getNeighborhood(r: NominatimResult): string {
  if (r.address?.suburb) return r.address.suburb;
  if (r.address?.neighbourhood) return r.address.neighbourhood;
  if (r.address?.city_district) return r.address.city_district;
  const parts = r.display_name.split(",").map((s) => s.trim());
  return parts[1] || "";
}

function getCityFromResult(r: NominatimResult): string {
  return r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || "";
}

export default function AddressAutocomplete({
  cityName = "",
  state = "SC",
  placeholder = "Digite o nome da rua...",
  disabled = false,
  value,
  requireNumber = true,
  onSelect,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [missingNumber, setMissingNumber] = useState(false);
  const [pendingResult, setPendingResult] = useState<NominatimResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== undefined && value !== query) setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (q.length < 3 || !cityName) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const locationParts = [q];
          if (cityName) locationParts.push(cityName);
          locationParts.push(state, "Brazil");
          const params = new URLSearchParams({
            q: locationParts.join(", "),
            format: "json",
            addressdetails: "1",
            limit: "6",
            countrycodes: "br",
          });
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            { headers: { "User-Agent": "FreteGarca/1.0" } }
          );
          const data: NominatimResult[] = await res.json();
          const filtered = cityName
            ? data.filter((r) => r.display_name.toLowerCase().includes(cityName.toLowerCase()))
            : data;
          setResults(filtered);
          setIsOpen(filtered.length > 0);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 800);
    },
    [cityName, state]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setSelectedNeighborhood("");
    setMissingNumber(false);
    setPendingResult(null);

    // If we had a pending result waiting for number, check if user typed a number now
    if (pendingResult && requireNumber) {
      const num = extractNumberFromInput(v);
      if (num) {
        completeSelection(pendingResult, num);
        return;
      }
    }

    search(v);
  };

  const formatResult = (r: NominatimResult) => {
    const road = r.address?.road || "";
    const number = r.address?.house_number || extractNumberFromInput(query);
    const neighborhood = getNeighborhood(r);

    let text = road || r.display_name.split(",")[0];
    if (number) text += `, ${number}`;
    if (neighborhood) text += ` - ${neighborhood}`;
    return text;
  };

  const completeSelection = (r: NominatimResult, overrideNumber?: string) => {
    const street = r.address?.road || r.display_name.split(",")[0];
    const houseNumber = overrideNumber || r.address?.house_number || extractNumberFromInput(query);
    const neighborhood = getNeighborhood(r);
    
    let displayText = street;
    if (houseNumber) displayText += `, ${houseNumber}`;
    if (neighborhood) displayText += ` - ${neighborhood}`;

    setQuery(displayText);
    setIsOpen(false);
    setSelectedNeighborhood(neighborhood);
    setMissingNumber(false);
    setPendingResult(null);

    onSelect({
      street,
      houseNumber,
      neighborhood,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      displayText,
      cityName: getCityFromResult(r),
    });
  };

  const handleSelect = (r: NominatimResult) => {
    const houseNumber = r.address?.house_number || extractNumberFromInput(query);

    if (requireNumber && !houseNumber) {
      // Set the street in query and ask for number
      const street = r.address?.road || r.display_name.split(",")[0];
      setQuery(`${street}, `);
      setIsOpen(false);
      setMissingNumber(true);
      setPendingResult(r);
      setSelectedNeighborhood(getNeighborhood(r));
      return;
    }

    completeSelection(r);
  };

  // Watch for number being typed when pending
  useEffect(() => {
    if (!pendingResult || !missingNumber) return;
    const num = extractNumberFromInput(query);
    if (num) {
      completeSelection(pendingResult, num);
    }
  }, [query, pendingResult, missingNumber]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={missingNumber ? "border-destructive ring-1 ring-destructive" : ""}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors border-b last:border-0"
              onClick={() => handleSelect(r)}
            >
              {formatResult(r)}
            </button>
          ))}
        </div>
      )}
      {missingNumber && (
        <p className="text-xs text-destructive mt-1 font-medium">
          ⚠️ Informe o número do endereço (ex: Rua Brasil, 123)
        </p>
      )}
      {selectedNeighborhood && !missingNumber && (
        <div className="mt-1.5">
          <Badge variant="secondary" className="text-xs font-normal">
            📍 Bairro: {selectedNeighborhood}
          </Badge>
        </div>
      )}
    </div>
  );
}
