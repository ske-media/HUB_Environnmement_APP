import { 
  FileText, Droplets, Wind, Beaker, Waves, Activity, LineChart, 
  GlassWater, Layers, Shovel, Shield, Radiation, MapPin, Package, 
  TreePine, Building2 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Types de fiches autorisés à être affichés dans le frontend
// Pour l'instant, on ne garde que les 4 types qui fonctionnent
export const ENABLED_SURVEY_TYPES = ['gas', 'soil', 'groundwater', 'pid'] as const;

// Définition d'un type pour la configuration pour plus de robustesse
export interface SurveyTypeInfo {
  name: string;
  icon: LucideIcon;
  colorClass: string; // Classe Tailwind pour la couleur (ex: 'text-blue-500')
  bgColorClass: string; // Classe Tailwind pour le fond (ex: 'bg-blue-100')
}

export const SURVEY_TYPE_CONFIG: Record<string, SurveyTypeInfo> = {
  'soil': { name: 'Sondage Sol', icon: FileText, colorClass: 'text-yellow-600', bgColorClass: 'bg-yellow-100' },
  'groundwater': { name: 'Eau Souterraine', icon: Droplets, colorClass: 'text-blue-600', bgColorClass: 'bg-blue-100' },
  'ambient_air': { name: 'Air Ambiant', icon: Wind, colorClass: 'text-cyan-600', bgColorClass: 'bg-cyan-100' },
  'gas': { name: 'Gaz du Sol', icon: Beaker, colorClass: 'text-purple-600', bgColorClass: 'bg-purple-100' },
  'surface_water': { name: 'Eau Superficielle', icon: Waves, colorClass: 'text-teal-600', bgColorClass: 'bg-teal-100' },
  'pid': { name: 'Campagne PID', icon: Activity, colorClass: 'text-red-600', bgColorClass: 'bg-red-100' },
  'piezometric': { name: 'Fiche Piézométrique', icon: LineChart, colorClass: 'text-indigo-600', bgColorClass: 'bg-indigo-100' },
  'tap_water': { name: 'Eau du Robinet', icon: GlassWater, colorClass: 'text-sky-600', bgColorClass: 'bg-sky-100' },
  'sediment': { name: 'Sédiments', icon: Layers, colorClass: 'text-orange-600', bgColorClass: 'bg-orange-100' },
  'excavation': { name: 'Suivi de Fouille', icon: Shovel, colorClass: 'text-amber-700', bgColorClass: 'bg-amber-100' },
  'risk_analysis': { name: 'Analyse des Risques', icon: Shield, colorClass: 'text-rose-600', bgColorClass: 'bg-rose-100' },
  'radon_soil': { name: 'Radon Sol', icon: Radiation, colorClass: 'text-lime-600', bgColorClass: 'bg-lime-100' },
  'site_visit': { name: 'Questionnaire Visite', icon: MapPin, colorClass: 'text-fuchsia-600', bgColorClass: 'bg-fuchsia-100' },
  'equipment_tracking': { name: 'Suivi Matériel', icon: Package, colorClass: 'text-slate-600', bgColorClass: 'bg-slate-100' },
  'garden_questionnaire': { name: 'Questionnaire Jardin', icon: TreePine, colorClass: 'text-green-600', bgColorClass: 'bg-green-100' },
  'icpe_visit': { name: 'Visite ICPE', icon: Building2, colorClass: 'text-muted-foreground', bgColorClass: 'bg-surface-200 dark:bg-surface-700' },
  'default': { name: 'Fiche Standard', icon: FileText, colorClass: 'text-muted-foreground', bgColorClass: 'bg-surface-200 dark:bg-surface-700' }
};

