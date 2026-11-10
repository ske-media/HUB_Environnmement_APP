import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LogOut,
  Settings,
  Building2,
  Home,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PageWrapper } from './PageWrapper';
import { Footer } from './Footer';
import { SiteSelectionSheet } from './SiteSelectionSheet';
import { SurveyTypeSelectionSheet } from './SurveyTypeSelectionSheet';
import { OfflineSyncManager } from './OfflineSyncManager';
import { ConfirmDialog } from './ConfirmDialog';
import { cn } from '@/lib/utils';

// Configuration des routes de navigation
const navigationItems = [
  { path: '/sites', label: 'Sites', icon: Building2 },
];

// Mapping des labels pour les breadcrumbs
const routeLabels: Record<string, string> = {
  sites: 'Sites',
  new: 'Nouveau',
  edit: 'Modifier',
  settings: 'Paramètres',
  surveys: 'Fiches',
  soil: 'Sol',
  groundwater: 'Eau souterraine',
  gas: 'Gaz',
  pid: 'PID',
  ambient_air: 'Air ambiant',
  surface_water: 'Eau de surface',
  piezometric: 'Piézométrique',
  tap_water: 'Eau du robinet',
  sediment: 'Sédiment',
  excavation: 'Excavation',
  risk_analysis: 'Analyse de risque',
  radon_soil: 'Radon sol',
  site_visit: 'Visite de site',
  equipment_tracking: 'Suivi équipement',
  garden_questionnaire: 'Questionnaire jardin',
  icpe_visit: 'Visite ICPE',
};

// Helper pour générer les breadcrumbs depuis le pathname
function generateBreadcrumbs(pathname: string): Array<{ label: string; path?: string }> {
  const parts = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; path?: string }> = [];
  
  if (parts.length === 0) return [];
  
  let currentPath = '';
  parts.forEach((part, index) => {
    currentPath += `/${part}`;
    const isLast = index === parts.length - 1;
    
    // Vérifier si c'est un type de sondage (ne pas créer de lien vers une route invalide)
    const isSurveyType = routeLabels[part] && ['soil', 'gas', 'groundwater', 'pid', 'ambient_air', 'surface_water', 'piezometric', 'tap_water', 'sediment', 'excavation', 'risk_analysis', 'radon_soil', 'site_visit', 'equipment_tracking', 'garden_questionnaire', 'icpe_visit'].includes(part);
    const isSurveyTypePath = index > 2 && parts[index - 2] === 'surveys' && isSurveyType;
    
    let label = routeLabels[part] || part;
    
    if (part.match(/^[a-f0-9-]{36}$/)) {
      if (index > 0 && parts[index - 1] === 'sites') {
        label = 'Détails du site';
      } else if (index > 2 && parts[index - 2] === 'surveys') {
        label = 'Fiche';
      } else {
        label = 'Détails';
      }
    } else if (!routeLabels[part]) {
      label = part.charAt(0).toUpperCase() + part.slice(1).replace(/_/g, ' ');
    }
    
    // Si c'est un type de sondage sans ID, ne pas créer de lien (route invalide)
    // Rediriger vers la page du site à la place
    let path: string | undefined = isLast ? undefined : currentPath;
    if (isSurveyTypePath && !parts[index + 1]) {
      // C'est un type de sondage sans ID ni "new", trouver le siteId et rediriger vers la page du site
      const siteIdIndex = parts.findIndex((p, i) => i > 0 && parts[i - 1] === 'sites' && p.match(/^[a-f0-9-]{36}$/));
      if (siteIdIndex !== -1) {
        path = `/${parts.slice(0, siteIdIndex + 1).join('/')}`;
      }
    }
    
    breadcrumbs.push({
      label,
      path,
    });
  });
  
  return breadcrumbs;
}

// Helper pour obtenir le titre de la page
function getPageTitle(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  
  if (parts.length === 0) return 'Dashboard';
  
  if (parts[0] === 'settings') return 'Paramètres';
  if (parts[0] === 'sites' && parts.length === 1) return 'Sites';
  if (parts[0] === 'sites' && parts[1] === 'new') return 'Nouveau Site';
  if (parts[0] === 'sites' && parts[2] === 'edit') return 'Modifier le Site';
  if (parts[0] === 'sites' && parts[2] === 'surveys' && parts[3] === 'new') return 'Nouvelle Fiche';
  
  if (parts[2] === 'surveys' && parts[3] && routeLabels[parts[3]]) {
    const surveyType = routeLabels[parts[3]];
    if (parts[4] === 'new') {
      return `Nouvelle Fiche - ${surveyType}`;
    } else if (parts[4]) {
      return `Modifier - ${surveyType}`;
    }
    return `Fiche - ${surveyType}`;
  }
  
  if (parts[0] === 'sites' && parts[1] && parts[1].match(/^[a-f0-9-]{36}$/)) {
    return 'Détails du Site';
  }
  
  const lastPart = parts[parts.length - 1];
  return routeLabels[lastPart] || lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/_/g, ' ');
}

export function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // États pour la navigation
  const [isDockHovered, setIsDockHovered] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const [isSurveyTypeSelectionOpen, setIsSurveyTypeSelectionOpen] = useState(false);
  const [isSiteSelectionOpen, setIsSiteSelectionOpen] = useState(false);
  const [selectedSurveyType, setSelectedSurveyType] = useState<string | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [parallaxOffsetX, setParallaxOffsetX] = useState(0);
  
  // Détection de la taille d'écran pour le dock collapsed
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDockCollapsed(window.innerWidth < 1280 && window.innerWidth >= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (window.innerWidth < 1024) return;

      const centerX = window.innerWidth / 2;
      const rawX = (event.clientX - centerX) / centerX;

      setParallaxOffsetX(Math.max(-1, Math.min(1, rawX)) * 8);
    };

    const handleMouseLeaveViewport = () => {
      setParallaxOffsetX(0);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeaveViewport);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeaveViewport);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  const breadcrumbs = generateBreadcrumbs(location.pathname);
  const pageTitle = getPageTitle(location.pathname);
  
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <OfflineSyncManager />
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        title="Se déconnecter ?"
        message="Vos modifications non synchronisées seront conservées localement et renvoyées à la reconnexion."
        confirmText="Se déconnecter"
        cancelText="Annuler"
        variant="warning"
        onConfirm={async () => {
          setIsLogoutConfirmOpen(false);
          await handleSignOut();
        }}
        onCancel={() => setIsLogoutConfirmOpen(false)}
      />
      {/* Fond discret et stable */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-28 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-accent/20 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(96,156,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(96,156,255,0.7) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
      </div>
      
      {/* ============================================
          DOCK FLOTTANT DESKTOP
          Détaché du bord, collapsed intelligent, s'étend au survol
          ============================================ */}
      <motion.aside
        ref={dockRef}
        initial={{ x: -100, opacity: 0 }}
        animate={{
          x: parallaxOffsetX,
          opacity: 1,
        }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-6 top-1/2 -translate-y-1/2 z-overlay hidden lg:block"
        onMouseEnter={() => setIsDockHovered(true)}
        onMouseLeave={() => setIsDockHovered(false)}
      >
        <motion.nav
          animate={{
            width: isDockCollapsed && !isDockHovered ? 68 : 84,
            scale: isDockHovered ? 1.025 : 1,
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className={cn(
            "glass-panel-lg p-3.5 flex flex-col items-center gap-3 shadow-indigo-lg border border-primary/25",
            "rounded-3xl",
            "bg-gradient-to-b from-white/85 via-white/70 to-white/60",
            "dark:from-surface-100/80 dark:via-surface-100/65 dark:to-surface-200/55"
          )}
        >
          {/* Icône Home */}
          <Link to="/" className="mb-1">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-indigo-sm transition-all duration-300",
                isActive('/')
                  ? "bg-primary/25 border-2 border-primary/70 shadow-indigo"
                  : "bg-gradient-to-br from-primary via-primary-600 to-primary-700"
              )}
            >
              <Home className={cn(
                "h-6 w-6 transition-all duration-300",
                isActive('/')
                  ? "text-primary dark:text-primary-foreground"
                  : "text-white"
              )} />
            </motion.div>
          </Link>
          
          {/* Séparateur subtil */}
          <div className="w-8 h-px bg-white/5 my-1" />
          
          {/* Liens de navigation - Icônes uniquement */}
          <div className="flex flex-col gap-2">
            {navigationItems.map(({ path, label, icon: Icon }, index) => (
              <motion.div
                key={path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to={path}
                  className={cn(
                    "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group",
                    isActive(path)
                      ? "bg-primary/20 border border-primary/45 shadow-indigo-sm"
                      : "border border-transparent hover:border-primary/25 hover:bg-white/55 dark:hover:bg-surface-300/30"
                  )}
                  title={label}
                >
                  {isActive(path) && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-r-full shadow-indigo-sm"
                    />
                  )}
                  <Icon className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive(path)
                      ? "text-primary dark:text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Séparateur */}
          <div className="w-8 h-px bg-white/5 my-1" />
          
          {/* Actions utilisateur */}
          <div className="mt-auto flex flex-col gap-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Link to="/settings">
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group cursor-pointer",
                    isActive('/settings')
                      ? "bg-primary/20 border border-primary/45 shadow-indigo-sm"
                      : "border border-transparent hover:border-primary/25 hover:bg-white/55 dark:hover:bg-surface-300/30"
                  )}
                  title="Paramètres"
                >
                  {isActive('/settings') && (
                    <motion.div
                      layoutId="activeIndicatorSettings"
                      className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-primary to-accent rounded-r-full shadow-indigo-sm"
                    />
                  )}
                  <Settings className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive('/settings')
                      ? "text-primary dark:text-primary-foreground"
                      : "text-muted-foreground group-hover:text-foreground"
                  )} />
                </motion.div>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.3 }}
            >
              <motion.button
                type="button"
                onClick={() => setIsLogoutConfirmOpen(true)}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group cursor-pointer",
                  "border border-transparent hover:border-error/25 hover:bg-error/10"
                )}
                title="Se déconnecter"
                aria-label="Se déconnecter"
              >
                <LogOut className="h-6 w-6 text-muted-foreground group-hover:text-error transition-all duration-300" />
              </motion.button>
            </motion.div>
          </div>
        </motion.nav>
      </motion.aside>
      
      {/* ============================================
          BOTTOM NAVIGATION BAR MOBILE
          Style iOS dock avec backdrop-blur-xl
          ============================================ */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-sticky lg:hidden",
          "flex justify-center",
          "px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.85rem)]",
          "pointer-events-none"
        )}
      >
        {/* Homepage - Centre */}
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          className="pointer-events-auto flex items-center justify-center"
        >
          <Link
            to="/"
            className={cn(
              "flex items-center justify-center transition-all duration-200 min-w-0"
            )}
          >
            <div className={cn(
              "h-[4rem] min-w-[5.5rem] px-6 rounded-2xl flex items-center justify-center transition-all duration-300",
              "border backdrop-blur-sm",
              isActive('/')
                ? "bg-gradient-to-r from-primary via-primary-600 to-accent border-primary/60 shadow-indigo-lg"
                : "bg-gradient-to-r from-primary/90 via-primary-600/90 to-accent/90 border-primary/45 shadow-indigo"
            )}>
              <Home className={cn(
                "h-6 w-6 transition-all duration-200 text-white",
                isActive('/') && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
              )} />
            </div>
          </Link>
        </motion.div>
      </motion.nav>

      {/* Sheet de sélection de type de fiche */}
      <SurveyTypeSelectionSheet
        open={isSurveyTypeSelectionOpen}
        onOpenChange={setIsSurveyTypeSelectionOpen}
        onTypeSelect={(surveyType) => {
          setSelectedSurveyType(surveyType);
          setIsSurveyTypeSelectionOpen(false);
          setIsSiteSelectionOpen(true);
        }}
      />
      
      {/* Sheet de sélection de site pour création de fiche */}
      <SiteSelectionSheet
        open={isSiteSelectionOpen}
        onOpenChange={(open) => {
          setIsSiteSelectionOpen(open);
          if (!open) {
            // Réinitialiser le type sélectionné quand le sheet se ferme
            setSelectedSurveyType(null);
          }
        }}
        surveyType={selectedSurveyType || undefined}
      />
      
      {/* ============================================
          CONTENU PRINCIPAL
          ============================================ */}
      <div className="flex flex-col min-h-screen relative z-content">
        <main
          className={cn(
            "flex-1 pt-8 pb-8 px-4 sm:px-6 lg:px-8",
            "lg:pl-32 xl:pl-36", // Plus d'espace entre le dock et le contenu
            "pb-32 lg:pb-24" // Padding pour la bottom nav mobile + footer flottant desktop
          )}
        >
          <AnimatePresence mode="wait">
            <PageWrapper key={location.pathname}>
              <Outlet />
            </PageWrapper>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </div>
  );
}