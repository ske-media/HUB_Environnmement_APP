import { motion } from 'framer-motion';
import { FileText, Droplets, Wind, Beaker, Waves, Activity, LineChart, GlassWater, Layers, Shovel, Shield, Radiation, MapPin, Package, TreePine, Building2 } from 'lucide-react';
import { isDevelopmentSurvey } from '../lib/developmentSurveys';
import { ENABLED_SURVEY_TYPES, SURVEY_TYPE_CONFIG } from '../lib/surveyTypes';
import { Sheet, SheetHeader, SheetTitle, SheetContent, SheetClose } from './ui/Sheet';
import { cn } from '@/lib/utils';

const SURVEY_TYPES = [
  {
    id: 'soil',
    name: 'Sols',
    description: 'Études des sols et sous-sols',
    icon: FileText,
    path: 'soil',
    category: 'Sondage de Terrain'
  },
  {
    id: 'groundwater',
    name: 'Eaux souterraines',
    description: 'Analyses des nappes phréatiques',
    icon: Droplets,
    path: 'groundwater',
    category: 'Sondage de Terrain'
  },
  {
    id: 'ambient_air',
    name: 'Air ambiant',
    description: 'Qualité de l\'air environnant',
    icon: Wind,
    path: 'ambient_air',
    category: 'Sondage de Terrain'
  },
  {
    id: 'gas',
    name: 'Gaz du sol',
    description: 'Mesures des émissions gazeuses',
    icon: Beaker,
    path: 'gas',
    category: 'Sondage de Terrain'
  },
  {
    id: 'surface_water',
    name: 'Eaux superficielles',
    description: 'Analyses des eaux de surface',
    icon: Waves,
    path: 'surface_water',
    category: 'Sondage de Terrain'
  },
  {
    id: 'pid',
    name: 'Campagne PID',
    description: 'Mesures PID',
    icon: Activity,
    path: 'pid',
    category: 'Sondage de Terrain'
  },
  {
    id: 'piezometric',
    name: 'Fiche piézométrique',
    description: 'Relevés piézométriques',
    icon: LineChart,
    path: 'piezometric',
    category: 'Sondage de Terrain'
  },
  {
    id: 'tap_water',
    name: 'Eaux du Robinet',
    description: 'Prélèvement des eaux du robinet',
    icon: GlassWater,
    path: 'tap_water',
    category: 'Sondage de Terrain'
  },
  {
    id: 'sediment',
    name: 'Sédiments',
    description: 'Prélèvement des sédiments',
    icon: Layers,
    path: 'sediment',
    category: 'Sondage de Terrain'
  },
  {
    id: 'excavation',
    name: 'Suivi de Fouille',
    description: 'Prélèvement bords et fonds de fouille',
    icon: Shovel,
    path: 'excavation',
    category: 'Sondage de Terrain'
  },
  {
    id: 'risk_analysis',
    name: 'Analyse des Risques',
    description: 'Analyse des risques préalables',
    icon: Shield,
    path: 'risk_analysis',
    category: 'Document de Projet & Sécurité'
  },
  {
    id: 'radon_soil',
    name: 'Radon Sol',
    description: 'Mesure du radon dans le sol',
    icon: Radiation,
    path: 'radon_soil',
    category: 'Sondage de Terrain'
  },
  {
    id: 'site_visit',
    name: 'Questionnaire Visite de Site',
    description: 'Audit et observation de site',
    icon: MapPin,
    path: 'site_visit',
    category: 'Document de Projet & Sécurité'
  },
  {
    id: 'equipment_tracking',
    name: 'Suivi Matériel',
    description: 'Logistique interne par chantier',
    icon: Package,
    path: 'equipment_tracking',
    category: 'Document de Projet & Sécurité'
  },
  {
    id: 'garden_questionnaire',
    name: 'Questionnaire Jardin',
    description: 'Évaluation usage et risques jardin résidentiel',
    icon: TreePine,
    path: 'garden_questionnaire',
    category: 'Document de Projet & Sécurité'
  },
  {
    id: 'icpe_visit',
    name: 'Visite ICPE',
    description: 'Questionnaire de visite ICPE - Audit conformité environnementale',
    icon: Building2,
    path: 'icpe_visit',
    category: 'Document de Projet & Sécurité'
  }
] as const;

interface SurveyTypeSelectionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTypeSelect: (surveyType: string) => void;
}

export function SurveyTypeSelectionSheet({ open, onOpenChange, onTypeSelect }: SurveyTypeSelectionSheetProps) {
  // Grouper les types de sondages par catégorie (uniquement les types autorisés)
  const groupedTypes = SURVEY_TYPES
    .filter(type => ENABLED_SURVEY_TYPES.includes(type.id as any))
    .reduce((acc, type) => {
      if (!acc[type.category]) {
        acc[type.category] = [];
      }
      acc[type.category].push(type);
      return acc;
    }, {} as Record<string, Array<typeof SURVEY_TYPES[number]>>);

  const handleTypeSelect = (surveyTypePath: string) => {
    onTypeSelect(surveyTypePath);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="bottom">
      <SheetHeader showDragIndicator>
        <SheetTitle>Sélectionner un type de fiche</SheetTitle>
        <SheetClose onClose={() => onOpenChange(false)} />
      </SheetHeader>
      <SheetContent>
        <div className="space-y-6">
          {Object.entries(groupedTypes).map(([category, types]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-white/90 mb-3 uppercase tracking-wider">
                {category}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {types.map((type) => {
                  const IconComponent = type.icon;
                  const config = SURVEY_TYPE_CONFIG[type.id] || SURVEY_TYPE_CONFIG.default;
                  const isDevelopment = isDevelopmentSurvey(type.id);
                  
                  return (
                    <motion.button
                      key={type.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTypeSelect(type.path)}
                      className={cn(
                        'relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl',
                        'glass-panel-lg border border-white/10',
                        'hover:border-primary/30 hover:shadow-indigo-glow-sm',
                        'transition-all duration-200',
                        'min-h-[100px]',
                        isDevelopment && 'border-warning/50'
                      )}
                    >
                      {isDevelopment && (
                        <div className="absolute -inset-1 bg-warning/20 rounded-xl blur-xl opacity-50 -z-10" />
                      )}
                      <div className={cn(
                        'p-2.5 rounded-xl',
                        config.bgColorClass,
                        'border border-white/20'
                      )}>
                        <IconComponent className={cn('h-5 w-5', config.colorClass)} />
                      </div>
                      <span className="text-xs font-medium text-center text-foreground dark:text-white line-clamp-2 leading-tight">
                        {type.name}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
