import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronRight, List } from 'lucide-react';
import { Button } from '../ui/Button';
import { useDeviceContext } from '../../hooks/useDeviceContext';
import { cn } from '@/lib/utils';

interface FormPageLayoutProps {
  siteId: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function FormPageLayout({ siteId, title, subtitle, children, sidebar }: FormPageLayoutProps) {
  const { isMobile } = useDeviceContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { surveyId } = useParams();
  const isEditMode = Boolean(surveyId);

  const [currentStep, setCurrentStep] = useState(0);
  const [showEditOverview, setShowEditOverview] = useState(isEditMode);

  const formElement = useMemo(() => {
    const rootChildren = React.Children.toArray(children);
    return rootChildren.find((node) => React.isValidElement(node) && node.type === 'form') as React.ReactElement | undefined;
  }, [children]);

  const formChildren = useMemo(
    () => (formElement ? React.Children.toArray(formElement.props.children) : []),
    [formElement]
  );

  const isFormSectionElement = (node: React.ReactNode) => {
    if (!React.isValidElement(node)) return false;
    const type = node.type as any;
    if (typeof type === 'string') return false;
    return type?.name === 'FormSection' || type?.displayName === 'FormSection';
  };

  const sectionElements = useMemo(
    () => formChildren.filter((node) => isFormSectionElement(node)) as React.ReactElement[],
    [formChildren]
  );
  const preSectionElements = useMemo(() => {
    const firstSectionIndex = formChildren.findIndex((node) => isFormSectionElement(node));
    if (firstSectionIndex <= 0) return [];
    return formChildren.slice(0, firstSectionIndex);
  }, [formChildren]);

  const totalSections = sectionElements.length;
  const safeStep = Math.min(Math.max(0, currentStep), Math.max(totalSections - 1, 0));
  const activeSection = sectionElements[safeStep];
  const isLastStep = safeStep === totalSections - 1;

  const sectionTitles = sectionElements.map((section, index) => ({
    index,
    number: String(section.props.number ?? index + 1),
    title: String(section.props.title ?? `Section ${index + 1}`),
  }));

  const saveCurrentDraft = () => {
    if (typeof window === 'undefined') return;
    const form = document.querySelector('form') as HTMLFormElement | null;
    if (!form) return;
    const data = Object.fromEntries(new FormData(form).entries());
    localStorage.setItem(
      `wizard-draft:${location.pathname}`,
      JSON.stringify({ updatedAt: new Date().toISOString(), step: safeStep, data })
    );
  };

  const goToNext = () => {
    saveCurrentDraft();
    if (isEditMode) {
      setShowEditOverview(true);
      return;
    }
    if (!isLastStep) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSections - 1));
      return;
    }
    const form = document.querySelector('form') as HTMLFormElement | null;
    form?.requestSubmit();
  };

  const goToPrevious = () => {
    saveCurrentDraft();
    if (safeStep > 0) setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const finishEditing = () => {
    saveCurrentDraft();
    const form = document.querySelector('form') as HTMLFormElement | null;
    if (form) {
      form.requestSubmit();
      return;
    }
    navigate(`/sites/${siteId}`);
  };

  const isWizardMobile = isMobile && totalSections > 0 && formElement;

  return (
    <div className="min-h-screen bg-transparent">
      <div
        className={cn(
          "w-full lg:max-w-7xl lg:mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 lg:pb-8",
          isWizardMobile && isEditMode ? "pb-28" : "pb-6"
        )}
      >
        <div
          className={cn(
            "mb-8 p-5 lg:p-6",
            isWizardMobile
              ? "rounded-none border-0 bg-transparent shadow-none px-1"
              : "glass-panel-lg rounded-2xl border border-primary/20"
          )}
        >
          <div className="flex items-center gap-4">
            <Link to={`/sites/${siteId}`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl border border-primary/20 hover:border-primary/35 hover:bg-white/70 dark:hover:bg-surface-300/35 transition-colors"
                aria-label="Retour"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">{title}</h1>
            </div>
          </div>
        </div>

        {isWizardMobile ? (
          <div className="space-y-4">
            <div className="p-1">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
                <span>{showEditOverview && isEditMode ? 'Vue d’ensemble' : `Section ${safeStep + 1} sur ${totalSections}`}</span>
                {!showEditOverview && <span>{Math.round(((safeStep + 1) / totalSections) * 100)}%</span>}
              </div>
              {!showEditOverview && (
                <div className="h-1.5 w-full rounded-full bg-primary/15">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${((safeStep + 1) / totalSections) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {React.cloneElement(formElement, {
              className: cn(
                formElement.props.className,
                "space-y-8",
                "[&_button[type='submit']]:hidden"
              ),
              children: (
                <>
                  {preSectionElements}

                  {isEditMode && showEditOverview ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {sectionTitles.map((section) => (
                        <button
                          key={section.index}
                          type="button"
                          onClick={() => {
                            setCurrentStep(section.index);
                            setShowEditOverview(false);
                          }}
                          className="w-full text-left rounded-2xl border border-primary/25 bg-white/60 dark:bg-surface-200/35 px-4 py-4 min-h-[64px] transition-all duration-200 hover:border-primary/45 hover:bg-white/75 dark:hover:bg-surface-200/45"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold inline-flex items-center justify-center shrink-0">
                                {section.number}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                  Section {section.number}
                                </p>
                                <p className="text-sm font-semibold text-foreground truncate">
                                  {section.title}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </button>
                      ))}
                      <Button
                        type="button"
                        variant="primary"
                        onClick={finishEditing}
                        className="w-full min-h-[48px]"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Terminer l'édition
                      </Button>
                    </motion.div>
                  ) : (
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={safeStep}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.22 }}
                      >
                        {activeSection}
                      </motion.div>
                    </AnimatePresence>
                  )}

                  {!isEditMode && !showEditOverview && (
                    <div className="pt-2 flex items-center gap-2">
                      {safeStep > 0 && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={goToPrevious}
                          className="min-h-[52px] px-4 font-bold"
                        >
                          PRECEDENT
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="primary"
                        onClick={goToNext}
                        className={cn(
                          "min-h-[52px] text-sm font-extrabold tracking-wide bg-gradient-to-r from-primary to-accent shadow-indigo-lg",
                          safeStep > 0 ? "flex-1" : "w-full"
                        )}
                      >
                        {isLastStep ? 'ENREGISTRER' : 'SUIVANT'}
                      </Button>
                    </div>
                  )}

                  {isEditMode && !showEditOverview && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={goToNext}
                        className="w-full min-h-[52px] text-sm font-extrabold tracking-wide bg-gradient-to-r from-primary to-accent shadow-indigo-lg"
                      >
                        SAUVEGARDER LA SECTION
                      </Button>
                    </div>
                  )}
                </>
              ),
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {children}
            </div>

            {sidebar && (
              <div className="lg:col-span-1">
                {sidebar}
              </div>
            )}
          </div>
        )}
      </div>

      {isWizardMobile && isEditMode && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] bg-transparent border-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={goToPrevious}
              disabled={showEditOverview || safeStep === 0}
              className="min-h-[48px] flex-1"
            >
              Précédent
            </Button>

            {isEditMode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEditOverview(true)}
                className="min-h-[48px] px-4"
                title="Vue d'ensemble"
              >
                <List className="h-5 w-5" />
              </Button>
            )}

            <Button
              type="button"
              variant="primary"
              onClick={goToNext}
              className={cn('min-h-[48px] flex-1', isLastStep && !isEditMode && 'bg-gradient-to-r from-primary to-accent')}
            >
              {isEditMode ? 'Enregistrer la section' : isLastStep ? 'Enregistrer' : 'Suivant'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
