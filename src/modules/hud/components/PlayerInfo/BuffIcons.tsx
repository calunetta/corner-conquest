import { Zap, Forward, Ban, Compass, ShieldCheck, Sparkles, Hammer } from 'lucide-react';

export const buffIconMap = {
  collector: <Sparkles className="h-2.5 w-2.5 text-emerald-400" />,
  explorer: <Compass className="h-2.5 w-2.5 text-cyan-400" />,
  reinforce: <ShieldCheck className="h-2.5 w-2.5 text-blue-400" />,
  efficient: <Zap className="h-2.5 w-2.5 text-amber-400" />,
  builder: <Hammer className="h-2.5 w-2.5 text-orange-400" />,
  'extra-move': <Forward className="h-2.5 w-2.5 text-yellow-300" />,
  sabotaged: <Ban className="h-2.5 w-2.5 text-red-400" />,
} as const;
