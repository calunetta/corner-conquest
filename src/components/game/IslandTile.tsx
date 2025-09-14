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
  'top-1 left-1', // Player 0
  'top-1 right-1', // Player 1
  'bottom-1 left-1', // Player 2
  'bottom-1 right-1', // Player 3
]

export function IslandTile({ island, players, onClick, isPossibleMove, isSelected }: IslandTileProps) {
  const occupants = island.occupants.map(id => players[id]);

  const getIcon = () => {
    if (island.isHidden) return <HelpCircle className="h-full w-full text-muted-foreground/50" />;
    if (island.isFetchingMonster) return <Loader2 className="h-full w-full animate-spin text-destructive" />;
    
    switch (island.type) {
      case 'base': return <Home className="h-full w-full" style={{ color: players[island.occupants[0]]?.color }}/>;
      case 'resource': return island.resourceType && <ResourceIcon type={island.resourceType} className="h-full w-full text-accent" />;
      case 'monster': return <Skull className="h-full w-full text-destructive" />;
      case 'special': return <Star className="h-full w-full text-yellow-400" />;
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
      
      <div className="h-1/2 w-1/2">{getIcon()}</div>

      {farmPlayer && (
        <div className="absolute bottom-1 left-1" title={`Farmed by ${farmPlayer.name}`}>
          <Wheat className="h-5 w-5" style={{color: farmPlayer.color}} />
        </div>
      )}
    </button>
  );
}
