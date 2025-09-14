import type { Island, Player, GameAction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ResourceIcon } from '../icons';
import { Home, HelpCircle, Skull, Star, Loader2, Wheat } from 'lucide-react';

type IslandTileProps = {
  island: Island;
  players: Player[];
  onClick: (x: number, y: number) => void;
  isPossibleMove: boolean;
  isSelected: boolean;
};

const playerColorMap = {
  blue: 'bg-blue-500 border-blue-300',
  red: 'bg-red-500 border-red-300',
  green: 'bg-green-500 border-green-300',
  yellow: 'bg-yellow-400 border-yellow-200',
};

const playerPositionClasses = [
  'top-0 left-0', // Player 0
  'top-0 right-0', // Player 1
  'bottom-0 left-0', // Player 2
  'bottom-0 right-0', // Player 3
]

export function IslandTile({ island, players, onClick, isPossibleMove, isSelected }: IslandTileProps) {
  const occupants = island.occupants.map(id => players[id]);

  const getIcon = () => {
    if (island.isHidden) return <HelpCircle className="h-full w-full text-muted-foreground/50" />;
    if (island.isFetchingMonster) return <Loader2 className="h-full w-full animate-spin text-destructive" />;
    
    switch (island.type) {
      case 'base': return <Home className="h-full w-full" style={{ color: players[island.occupants[0]]?.color }}/>;
      case 'resource': 
        return (
          <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-1 p-2">
            {island.resources.slice(0, 4).map((resource, index) => (
              <ResourceIcon key={index} type={resource} className="h-full w-full text-accent" />
            ))}
          </div>
        );
      case 'monster': return <Skull className="h-full w-full text-destructive p-2" />;
      case 'special': return <Star className="h-full w-full text-yellow-400 p-2" />;
      default: return null;
    }
  };

  const farmPlayer = island.farmedBy !== undefined ? players[island.farmedBy] : undefined;

  return (
    <button
      onClick={() => onClick(island.x, island.y)}
      className={cn(
        'aspect-square w-full rounded-lg border-2 flex items-center justify-center relative transition-all duration-200',
        island.isHidden ? 'bg-muted/30 border-dashed' : 'bg-card',
        isSelected ? 'border-primary ring-2 ring-primary' : '',
        isPossibleMove ? 'border-accent/70 hover:border-accent shadow-lg shadow-accent/20' : 'hover:border-foreground/50',
        farmPlayer ? `ring-2 ring-offset-2 ring-offset-background` : '',
      )}
      style={{
        ...(farmPlayer && { ringColor: farmPlayer.color })
      }}
      aria-label={`Island at ${island.x}, ${island.y}`}
    >
      <div className="absolute inset-0">
        {occupants.map(player => (
          <div key={player.id} className={cn('absolute h-4 w-4 rounded-full border-2', playerPositionClasses[player.id], playerColorMap[player.color])}>
          </div>
        ))}
      </div>
      
      <div className="h-full w-full">{getIcon()}</div>

      {farmPlayer && (
        <div className="absolute -bottom-1 -right-1" title={`Farmed by ${farmPlayer.name}`}>
          <Wheat className="h-5 w-5" style={{color: farmPlayer.color}} />
        </div>
      )}
    </button>
  );
}
