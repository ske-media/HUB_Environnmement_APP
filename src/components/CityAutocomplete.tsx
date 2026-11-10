import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { cn } from '../lib/utils';

interface CitySuggestion {
  id: string;
  label: string;
  city?: string;
  municipality?: string;
  lat: number;
  lon: number;
  context?: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (city: string, lat: number, lon: number, boundingBox?: [number, number, number, number]) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Rechercher une commune...',
  className = '',
  error,
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedValue = useDebounce(value, 200);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Recherche de communes via BAN (data.gouv.fr)
  useEffect(() => {
    const query = debouncedValue.trim();
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const searchCities = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=8&type=municipality`
        );

        if (!response.ok) {
          throw new Error('Erreur lors de la recherche de communes');
        }

        const data: {
          features?: Array<{
            geometry?: { coordinates?: [number, number] };
            properties?: {
              id?: string;
              label?: string;
              city?: string;
              municipality?: string;
              context?: string;
            };
          }>;
        } = await response.json();

        const mapped = (data.features || [])
          .map((feature) => {
            const [lon, lat] = feature.geometry?.coordinates || [NaN, NaN];
            const properties = feature.properties || {};
            return {
              id: properties.id || `${properties.label}-${lat}-${lon}`,
              label: properties.label || '',
              city: properties.city,
              municipality: properties.municipality,
              lat,
              lon,
              context: properties.context,
            } satisfies CitySuggestion;
          })
          .filter((item) => item.label && Number.isFinite(item.lat) && Number.isFinite(item.lon));

        setSuggestions(mapped);
        setShowSuggestions(true);
      } catch (err) {
        if (!(typeof navigator !== 'undefined' && navigator.onLine === false)) {
          console.error('Error fetching cities:', err);
        }
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchCities();
  }, [debouncedValue]);

  const handleSelect = (suggestion: CitySuggestion) => {
    const city = suggestion.city || suggestion.municipality || suggestion.label;
    
    onChange(city);
    onSelect(city, suggestion.lat, suggestion.lon);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  // Fermer les suggestions quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowSuggestions(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'mt-1 block w-full rounded-md border border-slate-200/40 dark:border-white/10',
            'bg-white/90 dark:bg-surface-200 text-foreground dark:text-white',
            'placeholder-muted-foreground shadow-sm',
            'focus:border-[#34519e] focus:ring-2 focus:ring-[#34519e]/20',
            'sm:text-sm px-4 py-3 pr-10 transition-all duration-200',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20'
          )}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
          ) : (
            <MapPin className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-[9999] w-full mt-1 bg-white dark:bg-surface-200 border border-slate-200/40 dark:border-white/10 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-surface-300',
                'transition-colors cursor-pointer',
                'text-sm text-foreground dark:text-white',
                index === selectedIndex && 'bg-slate-100 dark:bg-surface-300'
              )}
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="flex-1">{suggestion.label}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
