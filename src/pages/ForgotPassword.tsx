import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Footer } from '../components/Footer';
import { cn } from '@/lib/utils';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setMessage('Veuillez saisir votre adresse email.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`
      });
    } catch {
      // Message volontairement neutre pour ne jamais révéler d'information sur le compte.
    } finally {
      setMessage('Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.');
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
              Mot de passe oublié
            </h1>
            <p className="text-body text-muted-foreground">
              Nous vous envoyons un lien pour réinitialiser votre mot de passe.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {message && (
              <div className="rounded-xl glass-panel border border-success/30 p-4">
                <p className="text-body text-success">
                  {message}
                </p>
              </div>
            )}

            <div>
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
                    'w-full h-12 pl-12 pr-4 rounded-xl glass-panel border border-white/10 text-foreground placeholder-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                    'transition-all duration-200 font-medium'
                  )}
                  placeholder="votre.email@hub-environnement.com"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              loadingText="Envoi en cours..."
            >
              {!loading && (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Envoyer le lien
                </>
              )}
            </Button>

            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-body text-muted-foreground">
                <Link to="/login" className="font-semibold text-primary hover:text-primary-600 transition-colors duration-200">
                  Retour à la connexion
                </Link>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
}
