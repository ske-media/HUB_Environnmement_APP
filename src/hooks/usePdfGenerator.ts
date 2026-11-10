import { useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { generateAndDownloadPdf } from '../lib/pdf-generators/generatePdfDocument';

export function usePdfGenerator() {
  const [generatingSurveys, setGeneratingSurveys] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  const generatePdf = async (surveyType: string, surveyData: any, siteName: string, siteId?: string) => {
    const key = `${surveyType}_${Date.now()}`;
    
    setGeneratingSurveys(prev => new Set(prev).add(key));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[key];
      return newErrors;
    });

    try {
      await generateAndDownloadPdf(surveyType, surveyData, siteName, siteId);
      showToast('success', 'Le PDF a été généré avec succès !');
    } catch (err: any) {
      console.error('Erreur lors de la génération du PDF :', err);
      const errorMessage = err.message || 'Une erreur inconnue est survenue lors de la génération du PDF.';
      setErrors(prev => ({ ...prev, [key]: errorMessage }));
      showToast('error', `Erreur lors de la génération du PDF : ${errorMessage}`);
    } finally {
      setGeneratingSurveys(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const isGenerating = (surveyType?: string) => {
    if (surveyType) {
      return Array.from(generatingSurveys).some(key => key.startsWith(surveyType));
    }
    return generatingSurveys.size > 0;
  };
  
  const getError = (surveyType?: string) => {
    if (surveyType) {
      const errorKey = Object.keys(errors).find(key => key.startsWith(surveyType));
      return errorKey ? errors[errorKey] : null;
    }
    return Object.values(errors)[0] || null;
  };

  return { generatePdf, isGenerating, getError };
}