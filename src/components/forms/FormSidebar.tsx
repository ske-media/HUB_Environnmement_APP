import React, { useEffect, useState, useRef } from 'react';
import { FileText, Download, LucideIcon, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface FormSectionItem {
  id: string;
  number: number | string;
  title: string;
  icon?: LucideIcon;
}

interface FormSidebarProps {
  sections: FormSectionItem[];
  onGeneratePdf?: () => void;
  loading?: boolean;
  isGeneratingPdf?: boolean;
  className?: string;
  formId?: string;
}

export function FormSidebar({
  sections,
  onGeneratePdf,
  loading = false,
  isGeneratingPdf = false,
  className,
  formId = 'survey-form',
}: FormSidebarProps) {
  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    const form = document.getElementById(formId) as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };
  const [activeSection, setActiveSection] = useState<string | null>(sections[0]?.id || null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Créer un IntersectionObserver pour détecter quelle section est visible
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Trouver l'entrée la plus visible (avec le meilleur ratio)
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Trier par ratio décroissant pour trouver la section la plus visible
          const mostVisible = visibleEntries.reduce((prev, current) =>
            (current.intersectionRatio > prev.intersectionRatio ? current : prev)
          );
          setActiveSection(mostVisible.target.id);
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px', // Considérer une section active quand elle est dans le tiers supérieur
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observer toutes les sections
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [sections]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 100; // Compenser pour la navbar flottante
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const totalSections = sections.length;
  const activeIndex = sections.findIndex(s => s.id === activeSection);
  const progress = totalSections > 0 ? ((activeIndex + 1) / totalSections) * 100 : 0;

  return (
    <>
      {/* Mobile : Barre de progression horizontale */}
      <div className="lg:hidden mb-6 glass-panel-lg p-4 border border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-2 text-sm font-medium text-foreground"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span>Sommaire</span>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              isMobileMenuOpen && "transform rotate-180"
            )} />
          </button>
          <span className="text-xs text-muted-foreground">
            {activeIndex + 1} / {totalSections}
          </span>
        </div>
        
        {/* Barre de progression */}
        <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Menu déroulant mobile */}
        {isMobileMenuOpen && (
          <nav className="space-y-2 animate-enter">
            {sections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    scrollToSection(section.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:bg-primary/10 hover:text-primary',
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                      : 'text-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {SectionIcon && (
                      <SectionIcon className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {section.number}
                    </span>
                    <span className="truncate">{section.title}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Desktop : Sidebar sticky */}
      <aside
        className={cn(
          'hidden lg:block lg:sticky lg:top-24 lg:self-start h-fit space-y-6',
          className
        )}
      >
        {/* Sommaire */}
        <div className="glass-panel-lg p-6 border border-primary/20">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Sommaire
          </h3>
          <nav className="space-y-2">
            {sections.map((section) => {
              const SectionIcon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'hover:bg-primary/10 hover:text-primary',
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/25 shadow-indigo-sm'
                      : 'text-muted-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {SectionIcon && (
                      <SectionIcon className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                      {section.number}
                    </span>
                    <span className="truncate">{section.title}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Actions */}
        <div className="glass-panel-lg p-6 space-y-3 border border-primary/20">
        {onGeneratePdf && (
          <Button
            variant="secondary"
            onClick={onGeneratePdf}
            disabled={isGeneratingPdf}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPdf ? 'Génération...' : 'Générer PDF'}
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer la fiche'}
        </Button>
        </div>
      </aside>
    </>
  );
}

