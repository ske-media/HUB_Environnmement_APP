import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, KeyRound, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Footer } from '../components/Footer';
import { cn } from '@/lib/utils';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }
        setSessionValid(Boolean(data.session));
      } catch {
        setSessionValid(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkingSession || !sessionValid) {
      setError('Le lien de réinitialisation est invalide ou expiré.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const { data: currentSession, error: currentSessionError } = await supabase.auth.getSession();
      if (currentSessionError || !currentSession.session) {
        throw new Error('Recovery session missing');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login?reset=success'), 1800);
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch')) {
        setError('Impossible de contacter le serveur. Vérifiez votre connexion internet.');
      } else {
        setError('Le lien est peut-être expiré. Redemandez un nouveau lien de réinitialisation.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="max-w-md w-full relative z-10 flex-1 flex items-center"
      >
        <div className="glass-panel-lg p-8 lg:p-10 rounded-2xl w-full shadow-indigo-glow-lg">
          <div className="text-center mb-8">
            <h1 className="text-h1-lg font-bold text-foreground tracking-wide mb-2">
              Réinitialiser le mot de passe
            </h1>
            <p className="text-body text-muted-foreground">
              Choisissez un nouveau mot de passe sécurisé.
            </p>
          </div>

          {checkingSession ? (
            <p className="text-center text-body text-muted-foreground">Vérification du lien en cours...</p>
          ) : !sessionValid ? (
            <div className="space-y-4">
              <div className="rounded-xl glass-panel border border-error/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-body text-error">
                    Le lien de réinitialisation est invalide ou expiré.
                  </p>
                </div>
              </div>
              <Link
                to="/forgot-password"
                className="block text-center font-semibold text-primary hover:text-primary-600 transition-colors duration-200"
              >
                Renvoyer un lien
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-xl glass-panel border border-error/30 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
                    <p className="text-body text-error">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="rounded-xl glass-panel border border-success/30 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                    <p className="text-body text-success">
                      Mot de passe modifié avec succès. Redirection vers la connexion...
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-body font-medium text-foreground mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(
                      'w-full h-12 pl-12 pr-4 rounded-xl glass-panel border border-white/10 text-foreground placeholder-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                      'transition-all duration-200 font-medium'
                    )}
                    placeholder="Au moins 8 caractères"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-body font-medium text-foreground mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn(
                      'w-full h-12 pl-12 pr-4 rounded-xl glass-panel border border-white/10 text-foreground placeholder-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                      'transition-all duration-200 font-medium'
                    )}
                    placeholder="Répétez votre mot de passe"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || success}
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
                loadingText="Mise à jour..."
              >
                {!loading && 'Mettre à jour le mot de passe'}
              </Button>
            </form>
          )}
        </div>
      </motion.div>
      <Footer />
    </div>
  );
}
