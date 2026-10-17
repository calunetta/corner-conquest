import { RegistryIcon } from '@/modules/shared';

export const buffIconMap = {
  collector: <RegistryIcon id="sparkles" className="h-2.5 w-2.5 text-emerald-400" />,
  explorer: <RegistryIcon id="compass" className="h-2.5 w-2.5 text-cyan-400" />,
  reinforce: <RegistryIcon id="shield-check" className="h-2.5 w-2.5 text-blue-400" />,
  efficient: <RegistryIcon id="zap" className="h-2.5 w-2.5 text-amber-400" />,
  builder: <RegistryIcon id="hammer" className="h-2.5 w-2.5 text-orange-400" />,
  'extra-move': <RegistryIcon id="forward" className="h-2.5 w-2.5 text-yellow-300" />,
  sabotaged: <RegistryIcon id="ban" className="h-2.5 w-2.5 text-red-400" />,
} as const;
