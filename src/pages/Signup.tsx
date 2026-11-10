import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Mail, Lock, User, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useDialog } from '../contexts/DialogContext';
import { Button } from '../components/ui/Button';
import { Footer } from '../components/Footer';
import { cn } from '@/lib/utils';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const { showDialog } = useDialog();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Format d\'email invalide';
    }
    
    if (email.includes('@hub-environnement.com')) {
      return null;
    }
    
    if (email.includes('@hub-enivronnement.com')) {
      return 'Erreur de frappe détectée : "enivronnement" au lieu de "environnement"';
    }
    
    if (email.includes('@hub-environnment.com')) {
      return 'Erreur de frappe détectée : "environnment" au lieu de "environnement"';
    }
    
    return 'Seuls les emails @hub-environnement.com sont autorisés';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    const trimmedLast = lastName.trim();
    if (!trimmedLast) {
      setError('Le nom de famille est obligatoire.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const trimmedFirst = firstName.trim();
      const fullName = `${trimmedFirst} ${trimmedLast}`.trim();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            first_name: trimmedFirst,
            last_name: trimmedLast,
            role: 'user'
          },
          // Retour sur la page de connexion après confirmation de l'email.
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('Email address') && signUpError.message.includes('is invalid')) {
          setError('Format d\'email invalide. Vérifiez l\'orthographe de votre adresse email.');
        } else {
          setError(signUpError.message || 'Une erreur est survenue lors de la création du compte');
        }
        return;
      }

      if (data.user) {
        setError('');
        showDialog(
          'success',
          'Compte créé avec succès ! Veuillez vérifier votre boîte mail et cliquer sur le lien de confirmation pour activer votre compte.',
          'Compte créé'
        );
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Error during signup:', err);
      setError('Une erreur est survenue lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (newEmail) {
      const emailError = validateEmail(newEmail);
      setEmailValid(emailError === null);
    } else {
      setEmailValid(null);
    }
    
    if (error && validateEmail(newEmail) === null) {
      setError('');
    }
  };

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
              Créer un compte
            </h1>
            <p className="text-body text-muted-foreground">
              Rejoignez Hub Environnement
            </p>
          </motion.div>

          <form className="space-y-6" onSubmit={handleSubmit}>
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
                <label htmlFor="first-name" className="block text-body font-medium text-foreground mb-2">
                  Prénom
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="first-name"
                    name="first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={cn(
                      'w-full h-12 pl-12 pr-4 rounded-xl border border-primary/25 bg-white/95 dark:bg-white/14 text-foreground dark:text-white placeholder:text-surface-500 dark:placeholder:text-surface-700',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                      'transition-all duration-200 font-medium'
                    )}
                    placeholder="Votre prénom"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
              >
                <label htmlFor="last-name" className="block text-body font-medium text-foreground mb-2">
                  Nom <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    id="last-name"
                    name="last-name"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={cn(
                      'w-full h-12 pl-12 pr-4 rounded-xl border border-primary/25 bg-white/95 dark:bg-white/14 text-foreground dark:text-white placeholder:text-surface-500 dark:placeholder:text-surface-700',
                      'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                      'transition-all duration-200 font-medium'
                    )}
                    placeholder="Votre nom de famille"
                  />
                </div>
              </motion.div>

              {/* Email avec validation visuelle */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label htmlFor="email" className="block text-body font-medium text-foreground mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className={cn(
                      "h-5 w-5 transition-colors",
                      emailValid === true ? "text-success" : emailValid === false ? "text-error" : "text-muted-foreground"
                    )} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    className={cn(
                      'w-full h-12 pl-12 pr-12 rounded-xl border bg-white/95 dark:bg-white/14 text-foreground dark:text-white placeholder:text-surface-500 dark:placeholder:text-surface-700',
                      'focus:outline-none focus:ring-2 transition-all duration-200 font-medium',
                      emailValid === true 
                        ? 'border-success/50 focus:ring-success/50 focus:border-success/50' 
                        : emailValid === false
                        ? 'border-error/50 focus:ring-error/50 focus:border-error/50'
                        : 'border-primary/20 focus:ring-primary/50 focus:border-primary/50'
                    )}
                    placeholder="votre.email@hub-environnement.com"
                  />
                  {emailValid === true && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <CheckCircle className="h-5 w-5 text-success" />
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Mot de passe */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
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
                loadingText="Création en cours..."
              >
                {!loading && 'Créer le compte'}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center pt-4 border-t border-primary/15"
            >
              <p className="text-body text-muted-foreground">
                Déjà un compte ?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary hover:text-primary-600 transition-colors duration-200"
                >
                  Se connecter
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
