import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Sites } from './pages/Sites';
import { NewSite } from './pages/NewSite';
import { SiteSurveys } from './pages/SiteSurveys';
import { NewSurvey } from './pages/NewSurvey';
import { Settings } from './pages/Settings';
import { SoilSurveyForm } from './pages/surveys/SoilSurveyForm';
import { GroundwaterSurveyForm } from './pages/surveys/GroundwaterSurveyForm';
import { GasSurveyForm } from './pages/surveys/GasSurveyForm';
import { PIDSurveyForm } from './pages/surveys/PIDSurveyForm';
import { AmbientAirSurveyForm } from './pages/surveys/AmbientAirSurveyForm';
import { SurfaceWaterSurveyForm } from './pages/surveys/SurfaceWaterSurveyForm';
import { PiezometricSurveyForm } from './pages/surveys/PiezometricSurveyForm';
import { TapWaterSurveyForm } from './pages/surveys/TapWaterSurveyForm';
import { SedimentSurveyForm } from './pages/surveys/SedimentSurveyForm';
import { ExcavationSurveyForm } from './pages/surveys/ExcavationSurveyForm';
import { RiskAnalysisForm } from './pages/surveys/RiskAnalysisForm';
import { RadonSoilSurveyForm } from './pages/surveys/RadonSoilSurveyForm';
import { SiteVisitQuestionnaireForm } from './pages/surveys/SiteVisitQuestionnaireForm';
import { EquipmentTrackingForm } from './pages/surveys/EquipmentTrackingForm';
import { GardenQuestionnaireForm } from './pages/surveys/GardenQuestionnaireForm';
import { IcpeVisitQuestionnaireForm } from './pages/surveys/IcpeVisitQuestionnaireForm';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { DialogProvider } from './contexts/DialogContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const router = createBrowserRouter(
  [
    // Routes publiques
    { path: '/login', element: <Login /> },
    { path: '/signup', element: <Signup /> },
    { path: '/forgot-password', element: <ForgotPassword /> },
    { path: '/reset-password', element: <ResetPassword /> },
    { path: '/auth/update-password', element: <ResetPassword /> },

    // Routes protégées
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'settings', element: <Settings /> },
        { path: 'sites', element: <Sites /> },
        { path: 'sites/new', element: <NewSite /> },
        { path: 'sites/:siteId/edit', element: <NewSite /> },
        { path: 'sites/:siteId', element: <SiteSurveys /> },
        { path: 'sites/:siteId/surveys/new', element: <NewSurvey /> },

        // Formulaires de fiches (une route de création et une route d'édition par type)
        { path: 'sites/:siteId/surveys/soil/new', element: <SoilSurveyForm /> },
        { path: 'sites/:siteId/surveys/soil/:surveyId', element: <SoilSurveyForm /> },
        { path: 'sites/:siteId/surveys/groundwater/new', element: <GroundwaterSurveyForm /> },
        { path: 'sites/:siteId/surveys/groundwater/:surveyId', element: <GroundwaterSurveyForm /> },
        { path: 'sites/:siteId/surveys/gas/new', element: <GasSurveyForm /> },
        { path: 'sites/:siteId/surveys/gas/:surveyId', element: <GasSurveyForm /> },
        { path: 'sites/:siteId/surveys/pid/new', element: <PIDSurveyForm /> },
        { path: 'sites/:siteId/surveys/pid/:surveyId', element: <PIDSurveyForm /> },
        { path: 'sites/:siteId/surveys/ambient_air/new', element: <AmbientAirSurveyForm /> },
        { path: 'sites/:siteId/surveys/ambient_air/:surveyId', element: <AmbientAirSurveyForm /> },
        { path: 'sites/:siteId/surveys/surface_water/new', element: <SurfaceWaterSurveyForm /> },
        { path: 'sites/:siteId/surveys/surface_water/:surveyId', element: <SurfaceWaterSurveyForm /> },

        // Fiche piézométrique
        { path: 'sites/:siteId/surveys/piezometric/new', element: <PiezometricSurveyForm /> },
        { path: 'sites/:siteId/surveys/piezometric/:surveyId', element: <PiezometricSurveyForm /> },

        // Eau du robinet
        { path: 'sites/:siteId/surveys/tap_water/new', element: <TapWaterSurveyForm /> },
        { path: 'sites/:siteId/surveys/tap_water/:surveyId', element: <TapWaterSurveyForm /> },

        // Sédiments
        { path: 'sites/:siteId/surveys/sediment/new', element: <SedimentSurveyForm /> },
        { path: 'sites/:siteId/surveys/sediment/:surveyId', element: <SedimentSurveyForm /> },

        // Suivi de fouille
        { path: 'sites/:siteId/surveys/excavation/new', element: <ExcavationSurveyForm /> },
        { path: 'sites/:siteId/surveys/excavation/:surveyId', element: <ExcavationSurveyForm /> },

        // Analyse des risques
        { path: 'sites/:siteId/surveys/risk_analysis/new', element: <RiskAnalysisForm /> },
        { path: 'sites/:siteId/surveys/risk_analysis/:surveyId', element: <RiskAnalysisForm /> },

        // Radon sol
        { path: 'sites/:siteId/surveys/radon_soil/new', element: <RadonSoilSurveyForm /> },
        { path: 'sites/:siteId/surveys/radon_soil/:surveyId', element: <RadonSoilSurveyForm /> },

        // Questionnaire de visite de site
        { path: 'sites/:siteId/surveys/site_visit/new', element: <SiteVisitQuestionnaireForm /> },
        { path: 'sites/:siteId/surveys/site_visit/:surveyId', element: <SiteVisitQuestionnaireForm /> },

        // Suivi matériel
        {
          path: 'sites/:siteId/surveys/equipment_tracking/new',
          element: <EquipmentTrackingForm onSubmit={() => {}} />,
        },
        {
          path: 'sites/:siteId/surveys/equipment_tracking/:surveyId',
          element: <EquipmentTrackingForm onSubmit={() => {}} />,
        },

        // Questionnaire jardin
        { path: 'sites/:siteId/surveys/garden_questionnaire/new', element: <GardenQuestionnaireForm /> },
        { path: 'sites/:siteId/surveys/garden_questionnaire/:surveyId', element: <GardenQuestionnaireForm /> },

        // Questionnaire de visite ICPE
        { path: 'sites/:siteId/surveys/icpe_visit/new', element: <IcpeVisitQuestionnaireForm /> },
        { path: 'sites/:siteId/surveys/icpe_visit/:surveyId', element: <IcpeVisitQuestionnaireForm /> },
      ],
    },
  ],
  {
    future: { v7_startTransition: true, v7_relativeSplatPath: true },
  },
);

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DialogProvider>
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </DialogProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}