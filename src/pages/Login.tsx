import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle, Mail, Lock, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Footer } from '../components/Footer';
import { cn } from '@/lib/utils';

export function Login() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const resetSuccess = searchParams.get('reset') === 'success';
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signIn(email, password, rememberMe);
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      navigate('/');
    } catch (err: any) {
      console.error('Error during login:', err);
      
      if (err?.message?.includes('connexion internet')) {
        setError(err.message);
      } else if (err?.message?.includes('email n\'est pas encore confirmé')) {
        setError(err.message);
      } else if (err?.message === 'Invalid login credentials' || err?.code === 'invalid_credentials') {
        setError('Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.');
      } else {
        setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    try {
      setResendingConfirmation(true);
      setError('');
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        setError('Erreur lors de l\'envoi de l\'email de confirmation. Veuillez réessayer.');
      } else {
        setError('Email de confirmation renvoyé ! Vérifiez votre boîte mail.');
      }
    } catch (err: any) {
      setError('Erreur lors de l\'envoi de l\'email de confirmation.');
    } finally {
      setResendingConfirmation(false);
    }
  };

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute -bottom-44 -right-28 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[110px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="max-w-md w-full relative z-10 flex-1 flex items-center"
      >
        <div className="glass-panel-lg p-8 lg:p-10 rounded-2xl w-full shadow-indigo-lg border border-primary/25">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-8"
          >
            <motion.div
              whileHover={{ scale: 1.04 }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center p-3 shadow-indigo"
            >
              <img
                src="/hub-environnement-logo.png"
                alt="Hub Environnement"
                className="w-full h-full object-contain brightness-0 invert dark:brightness-100 dark:invert-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-8"
          >
            <h1 className="text-h1-lg font-semibold text-foreground tracking-wide mb-2">
              Connexion
            </h1>
            <p className="text-body text-muted-foreground">
              Accédez à votre espace Hub Environnement
            </p>
          </motion.div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {resetSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl glass-panel border border-success/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-success">
                      Mot de passe mis à jour. Vous pouvez maintenant vous connecter.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl glass-panel border border-error/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <AlertCircle className="h-5 w-5 text-error" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-error">{error}</p>
                    {error.includes('email n\'est pas encore confirmé') && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={handleResendConfirmation}
                        disabled={resendingConfirmation}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-caption font-medium rounded-lg text-error glass-panel border border-error/30 hover:bg-error/10 focus:outline-none focus:ring-2 focus:ring-error/50 disabled:opacity-50 transition-all duration-200"
                      >
                        <Mail className="h-3 w-3" />
                        {resendingConfirmation ? 'Envoi...' : 'Renvoyer l\'email de confirmation'}
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label htmlFor="email" className="block text-body font-medium text-foreground mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={cn(
                      'w-full h-12 pl-12 pr-4 rounded-xl border border-primary/25 bg-white/95 dark:bg-white/14 text-foreground dark:text-white placeholder:text-surface-500 dark:placeholder:text-surface-700',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                      'transition-all duration-200 font-medium'
                    )}
                    placeholder="votre.email@hub-environnement.com"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label htmlFor="password" className="block text-body font-medium text-foreground mb-2">
                  Mot de passe
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
                      'w-full h-12 pl-12 pr-4 rounded-xl border border-primary/25 bg-white/95 dark:bg-white/14 text-foreground dark:text-white placeholder:text-surface-500 dark:placeholder:text-surface-700',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                      'transition-all duration-200 font-medium'
                    )}
                    placeholder="••••••••"
                  />
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-5 w-5 rounded border-white/20 bg-white/5 text-primary focus:ring-2 focus:ring-primary/50 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-body text-foreground cursor-pointer">
                  Se souvenir de moi
                </label>
              </div>

              <Link
                to="/forgot-password"
                reloadDocument
                className="text-body font-medium text-primary dark:text-white hover:text-primary-600 dark:hover:text-primary-100 transition-colors duration-200"
              >
                Mot de passe oublié ?
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                type="submit"
                disabled={loading}
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
                loadingText="Connexion..."
              >
                {!loading && (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Se connecter
                  </>
                )}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center pt-4 border-t border-primary/15"
            >
              <p className="text-body text-muted-foreground">
                Pas encore de compte ?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-primary dark:text-white hover:text-primary-600 dark:hover:text-primary-100 transition-colors duration-200"
                >
                  Créer un compte
                </Link>
              </p>
            </motion.div>
          </form>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
}
