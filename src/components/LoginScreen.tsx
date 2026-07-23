import React, { useState, useRef, useEffect } from 'react';
import { Brain, Sparkles, ShieldCheck, ArrowRight, Lock, Mail, User, Eye, EyeOff, KeyRound, Cpu, CheckCircle2 } from 'lucide-react';
import { DotField } from './DotField';

export interface UserProfile {
  name: string;
  email: string;
  avatarInitials: string;
}

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      } else {
        setContainerSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setErrorNotice('Por favor completa todos los campos requeridos.');
      return;
    }

    setErrorNotice(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const userName = name || email.split('@')[0] || 'Guillermo';
      const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '2B';

      onLogin({
        name: userName,
        email: email,
        avatarInitials: initials
      });
    }, 800);
  };

  const handleQuickGuestLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        name: 'Guillermo (Demo)',
        email: 'guillermo@2brain.ai',
        avatarInitials: 'G'
      });
    }, 500);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePos(null)}
      className="min-h-screen bg-[#0f0d15] text-[#f1f1f1] flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans"
    >
      {/* Background Radial Glow */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#4d445c_0%,_transparent_70%)]"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#fe7674]/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#c8bfff]/15 rounded-full blur-3xl"></div>
      </div>

      {/* Interactive Canvas Dot Field Background */}
      <DotField
        width={containerSize.width}
        height={containerSize.height}
        mousePos={mousePos}
      />

      {/* Main Card Container */}
      <div className="relative z-10 w-full max-w-4xl bg-[#15121b]/90 backdrop-blur-2xl border border-[#27272a] rounded-[2rem] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* Left Side: Brand & Neural Showcase (5 columns) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#1d1a23] via-[#16131d] to-[#0f0d15] p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#27272a] relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#1b1b1b] flex items-center justify-center font-black text-xl shadow-lg">
                2B
              </div>
              <span className="text-2xl font-black tracking-tighter text-white italic">
                2Brain
              </span>
            </div>

            {/* Tagline */}
            <div className="space-y-3 pt-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                Tu Memoria Semántica Relacional
              </h1>
              <p className="text-xs sm:text-sm text-[#cfc4c5] leading-relaxed">
                Interconecta tus pensamientos, proyectos e ideas en una red neuronal visual ejecutable 100% en tu navegador.
              </p>
            </div>

            {/* Feature Badges */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs text-[#cfc4c5] bg-[#0f0d15]/60 px-3.5 py-2.5 rounded-xl border border-[#27272a]">
                <Cpu className="w-4 h-4 text-[#c8bfff] shrink-0" />
                <span>Búsqueda Vectorial Local con Gemma 2B</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#cfc4c5] bg-[#0f0d15]/60 px-3.5 py-2.5 rounded-xl border border-[#27272a]">
                <ShieldCheck className="w-4 h-4 text-[#fe7674] shrink-0" />
                <span>Privacidad Total y Cero Latencia Cloud</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#cfc4c5] bg-[#0f0d15]/60 px-3.5 py-2.5 rounded-xl border border-[#27272a]">
                <Brain className="w-4 h-4 text-white shrink-0" />
                <span>Grafo de Nodos Interactivo 2D</span>
              </div>
            </div>
          </div>

          {/* Footer Status Badge */}
          <div className="relative z-10 pt-8 mt-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#fe7674] animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#7e7576]">
              Neural Link v2.4 Active
            </span>
          </div>
        </div>

        {/* Right Side: Interactive Form (7 columns) */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6">
          {/* Header Switcher */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                {isSignUp ? 'Crear Cuenta 2Brain' : 'Iniciar Sesión'}
              </h2>
              <p className="text-xs text-[#7e7576] mt-1">
                {isSignUp ? 'Accede a tu matriz de memoria personal' : 'Bienvenido de nuevo a tu red de conocimiento'}
              </p>
            </div>

            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorNotice(null);
              }}
              className="text-xs font-bold text-[#c8bfff] hover:underline"
            >
              {isSignUp ? '¿Ya tienes cuenta?' : 'Crear cuenta'}
            </button>
          </div>

          {/* Error Notice */}
          {errorNotice && (
            <div className="bg-[#fe7674]/15 border border-[#fe7674]/40 text-[#fe7674] text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <span>⚠️ {errorNotice}</span>
            </div>
          )}

          {/* Login / Sign Up Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-[#cfc4c5]">Nombre Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7e7576] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Guillermo Pérez"
                    className="w-full bg-[#0f0d15] border border-[#27272a] focus:border-white rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#7e7576] outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#cfc4c5]">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#7e7576] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@2brain.ai"
                  className="w-full bg-[#0f0d15] border border-[#27272a] focus:border-white rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#7e7576] outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-[#cfc4c5]">Contraseña</label>
                {!isSignUp && (
                  <button type="button" className="text-[11px] text-[#7e7576] hover:text-[#cfc4c5] transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#7e7576] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#0f0d15] border border-[#27272a] focus:border-white rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-[#7e7576] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7e7576] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#cfc4c5]">
                <input type="checkbox" defaultChecked className="rounded border-[#27272a] bg-[#0f0d15] text-white accent-white" />
                <span>Recordarme en este dispositivo</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-white text-[#1b1b1b] font-bold text-xs hover:bg-neutral-200 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>{isSignUp ? 'Crear Cuenta e Ingresar' : 'Ingresar a 2Brain'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-[#27272a] w-full"></div>
            <span className="bg-[#15121b] px-3 text-[10px] font-bold uppercase tracking-wider text-[#7e7576] absolute">
              O accede rápidamente
            </span>
          </div>

          {/* Quick Demo Mode Button */}
          <button
            onClick={handleQuickGuestLogin}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-[#1d1a23] border border-[#27272a] hover:border-white text-white font-bold text-xs transition-all flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-4 h-4 text-[#c8bfff] group-hover:rotate-12 transition-transform" />
            <span>Ingresar como Invitado (Demo Mode 1-Click)</span>
          </button>

        </div>
      </div>
    </div>
  );
};
