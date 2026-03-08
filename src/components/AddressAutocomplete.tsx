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
  onClear?: () => void;
}

/** Normalize query: trim, collapse spaces, fix commas glued to numbers */
function normalizeQuery(input: string): string {
  let q = input.trim();
  // Collapse multiple spaces
  q = q.replace(/\s{2,}/g, " ");
  // Fix comma glued to number: "rua 230,570" → "rua 230, 570"
  q = q.replace(/,(\S)/g, ", $1");
  return q;
}

/** Extract house number from input — flexible patterns */
function extractNumberFromInput(input: string): string {
  // Pattern 1: after comma (with or without space): "Rua X, 123" or "Rua X,123"
  const commaMatch = input.match(/,\s*(\d+)/);
  if (commaMatch) return commaMatch[1];

  // Pattern 2: "nº 123" or "n 123" or "numero 123"
  const nMatch = input.match(/n[ºo°]?\s*(\d+)/i);
  if (nMatch) return nMatch[1];

  // Pattern 3: last number in the string (but not if it's part of street name like "rua 230")
  // Only use if there are at least 2 number groups (street number + house number)
  const allNumbers = input.match(/\d+/g);
  if (allNumbers && allNumbers.length >= 2) {
    return allNumbers[allNumbers.length - 1];
  }

  return "";
}

/** Strip numbers that look like house numbers from query for fallback search */
function stripHouseNumber(input: string): string {
  // Remove ", 123" or ",123" patterns
  let q = input.replace(/,\s*\d+/, "");
  // Remove trailing standalone number
  q = q.replace(/\s+\d+\s*$/, "");
  return q.trim();
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

function normalizeComparable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isCityMatch(result: NominatimResult, cityName: string): boolean {
  if (!cityName) return true;
  const expected = normalizeComparable(cityName);
  const cityFromAddress = normalizeComparable(getCityFromResult(result));
  const display = normalizeComparable(result.display_name);
  return cityFromAddress.includes(expected) || display.includes(expected);
}

async function fetchNominatim(
  queryText: string,
  cityName: string,
  state: string
): Promise<NominatimResult[]> {
  const locationParts = [queryText];
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
    `https://nominatim.openstreetmap.org/search?${params}`
  );
  return res.json();
}

export default function AddressAutocomplete({
  cityName = "",
  state = "SC",
  placeholder = "Digite o nome da rua...",
  disabled = false,
  value,
  requireNumber = true,
  onSelect,
  onClear,
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
      const normalized = normalizeQuery(q);
      if (normalized.length < 3) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          let data = await fetchNominatim(normalized, cityName, state);

          // Filter by cityName only if provided (accent-insensitive and tolerant)
          if (cityName) {
            const filtered = data.filter((r) => isCityMatch(r, cityName));
            data = filtered.length > 0 ? filtered : data;
          }

          // Fallback: if no results, retry without house number part
          if (data.length === 0) {
            const stripped = stripHouseNumber(normalized);
            if (stripped !== normalized && stripped.length >= 3) {
              let fallback = await fetchNominatim(stripped, cityName, state);
              if (cityName) {
                fallback = fallback.filter((r) =>
                  r.display_name.toLowerCase().includes(cityName.toLowerCase())
                );
              }
              data = fallback;
            }
          }

          setResults(data);
          setIsOpen(data.length > 0);
        } catch {
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 500);
    },
    [cityName, state]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setSelectedNeighborhood("");
    setMissingNumber(false);

    // If user is editing/clearing, notify parent to reset coords
    if (!pendingResult) {
      onClear?.();
    }

    if (pendingResult && requireNumber) {
      const num = extractNumberFromInput(v);
      if (num) {
        completeSelection(pendingResult, num);
        return;
      }
    } else {
      setPendingResult(null);
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
