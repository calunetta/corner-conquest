import type { Island, Player, GameAction, ResourceType, IslandResource } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ResourceIcon, MonsterIcon } from '../icons';
import { Home, HelpCircle, Star, Loader2, Anchor } from 'lucide-react';

type IslandTileProps = {
  island: Island;
  players: Player[];
  onClick: (x: number, y: number) => void;
  isPossibleMove: boolean;
  isSelected: boolean;
  isCurrentPlayerTile: boolean;
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

const playerTileIndicatorClasses: Record<string, string> = {
    blue: 'shadow-blue-500/50',
    red: 'shadow-red-500/50',
    green: 'shadow-green-500/50',
    yellow: 'shadow-yellow-400/50',
}

export function IslandTile({ island, players, onClick, isPossibleMove, isSelected, isCurrentPlayerTile }: IslandTileProps) {
  const occupants = island.occupants.map(id => players[id]);
  const positionedBy = island.positionedBy || [];
  const currentPlayer = occupants.find(p => isCurrentPlayerTile && p.id === island.occupants.find(id => players[id] && players[id].position.x === island.x && players[id].position.y === island.y));


  const renderResourceIcons = (resources: IslandResource[]) => {
    return resources.map((resource, index) => (
      <div key={`resource-row-${index}`} className="flex items-center justify-center gap-1">
        {Array.from({ length: resource.amount }).map((_, i) => (
          <ResourceIcon key={`${resource.type}-${i}`} type={resource.type} className="h-4 w-4 text-accent" />
        ))}
      </div>
    ));
  }

  const renderMonsterIcons = () => {
    if (!island.monsters) return null;
    return island.monsters.map((monster, i) => (
      <div key={`monster-row-${i}`} className="flex items-center justify-center gap-1">
        <MonsterIcon level={monster.level} className="h-5 w-5" />
        <span className="text-xs font-bold text-destructive">Lvl: {monster.level}</span>
      </div>
    ));
  }

  const getIcon = () => {
    if (island.isHidden) return <HelpCircle className="h-full w-full text-muted-foreground/50" />;
    if (island.isFetchingMonster) return <Loader2 className="h-full w-full animate-spin text-destructive" />;
    
    switch (island.type) {
      case 'base': return <Home className="h-full w-full" style={{ color: players[island.occupants[0]]?.color }}/>;
      case 'resource': 
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
            {renderResourceIcons(island.resources)}
          </div>
        );
      case 'monster': 
        return (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
            {renderMonsterIcons()}
          </div>
        );
      case 'special': return <Star className="h-full w-full text-yellow-400 p-2" />;
      default: return null;
    }
  };

  const getPositionedPlayerPositionClass = (playerId: number) => {
    // This is a simple way to not overlap with the main player icons.
    // It can be improved for more players.
    const positions = [
        'top-1/2 left-0 -translate-y-1/2',
        'top-0 left-1/2 -translate-x-1/2',
        'bottom-0 left-1/2 -translate-x-1/2',
        'top-1/2 right-0 -translate-y-1/2',
    ];
    return positions[playerId];
  }

  const getPositionedResourceIcon = (resource: ResourceType) => {
    const iconMap: Record<ResourceType, React.ReactNode> = {
      gems: <ResourceIcon type="gems" className="h-3 w-3" />,
      iron: <ResourceIcon type="iron" className="h-3 w-3" />,
      food: <ResourceIcon type="food" className="h-3 w-3" />,
    }
    return iconMap[resource];
  }

  return (
    <button
      onClick={() => onClick(island.x, island.y)}
      className={cn(
        'aspect-square w-full rounded-lg border-2 flex items-center justify-center relative transition-all duration-200',
        island.isHidden ? 'bg-muted/30 border-dashed' : 'bg-card',
        isSelected ? 'border-primary ring-2 ring-primary' : '',
        isPossibleMove ? 'border-accent/70 hover:border-accent shadow-lg shadow-accent/20' : 'hover:border-foreground/50',
        isCurrentPlayerTile && currentPlayer ? `shadow-lg ${playerTileIndicatorClasses[currentPlayer.color]}`: ''
      )}
      aria-label={`Island at ${island.x}, ${island.y}`}
    >
      <div className="absolute inset-0">
        {occupants.map(player => (
          <div key={player.id} className={cn('absolute h-4 w-4 rounded-full border-2', playerPositionClasses[player.id], playerColorMap[player.color])}>
          </div>
        ))}
      </div>
      
      <div className="h-full w-full">{getIcon()}</div>

      <div className="absolute inset-0">
        {positionedBy.map(pos => {
            const player = players[pos.playerId];
            if (!player) return null;
            return (
                <div key={`pos-${player.id}`} className={cn('absolute flex items-center gap-0.5', getPositionedPlayerPositionClass(player.id))} title={`Positioned by ${player.name} on ${pos.resource}`}>
                    <Anchor className="h-4 w-4" style={{color: player.color}} />
                    {getPositionedResourceIcon(pos.resource)}
                </div>
            )
        })}
       </div>
    </button>
  );
}
