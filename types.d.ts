/**
 * @pallari/italian-address-client
 * TypeScript definitions for the isomorphic Italian Address Client.
 */

export interface Region {
  code: string;
  name: string;
}

export interface Province {
  code: string;
  name: string;
  initials: string;
  region_code: string;
}

export interface StreetType {
  id: number;
  nome: string;
}

export interface Municipality {
  istat_code: string;
  name: string;
  name_other_language: string | null;
  region_code: string;
  region: string;
  province_code: string;
  province: string;
  cadastral_code: string;
}

export interface Street {
  id: number;
  istat_code: string;
  municipality: string;
  national_id: number;
  street_type: string;
  display_street_type: string;
  name: string;
  display_name: string;
  full_street_name: string;
  locality: string | null;
  province?: string;
  region?: string;
  display_municipality?: string;
}

export interface Address {
  id: number;
  street_id: number;
  istat_code: string;
  number: number | null;
  extension: string | null;
  full_number: string;
  specificity: string | null;
  other_entries_count: number;
  metric: string | null;
  zip_code: string | null;
  longitude: number | null;
  latitude: number | null;
  geom: any | null;
}

export interface AccessPoint {
  id: number;
  street_id: number;
  national_id: string;
  label: string;
  number: number | null;
  extension: string | null;
}

export interface ClientOptions {
  baseUrl?: string;
  debounceMs?: number;
}

export interface SearchOptions {
  limit?: number;
  province_code?: string;
  istat_code?: string;
  smart?: boolean;
  strict?: boolean;
  dug_id?: number;
}

export interface AutocompleteConfig {
  fields: {
    region?: HTMLElement | HTMLSelectElement;
    province?: HTMLElement | HTMLSelectElement;
    street_type?: HTMLSelectElement;
    municipality?: HTMLElement | HTMLSelectElement;
    street?: HTMLElement | HTMLSelectElement;
  };
  outputs?: {
    region_code?: HTMLInputElement;
    province_code?: HTMLInputElement;
    istat_code?: HTMLInputElement;
    street_id?: HTMLInputElement;
  };
  options?: {
    smart?: boolean;
    strict?: boolean;
  };
  onRegionChange?: (region: Region | null) => void;
  onProvinceChange?: (province: Province | null) => void;
  onMunicipalityChange?: (municipality: Municipality | null) => void;
  onStreetChange?: (street: Street | null) => void;
  onDugChange?: (dug_id: number | null) => void;
  onStateChange?: (state: any) => void;
}

export class ItalianAddressClient {
  constructor(options?: ClientOptions);
  baseUrl: string;
  debounceMs: number;
  state: {
    region: Region | null;
    province: Province | null;
    municipality: Municipality | null;
    street: Street | null;
    dug_id: number | null;
  };

  /**
   * Generic debounce helper
   */
  debounce<T extends (...args: any[]) => any>(func: T, wait?: number): (...args: Parameters<T>) => void;

  /**
   * Internal fetch helper
   */
  _fetch<T = any>(endpoint: string, params?: Record<string, any>): Promise<T[]>;

  /**
   * Internal RPC helper
   */
  _rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<T[]>;

  // Data Methods
  getRegions(): Promise<Region[]>;
  getProvinces(regionCode?: string | null): Promise<Province[]>;
  getDugs(): Promise<StreetType[]>;
  searchMunicipalities(query: string, options?: SearchOptions): Promise<Municipality[]>;
  searchStreets(query: string, options?: SearchOptions): Promise<Street[]>;
  getAddressDetails(id: number | string): Promise<any>;

  // UI Methods (Browser Only)
  attachAutocomplete(config: AutocompleteConfig): void;
}

export default ItalianAddressClient;
