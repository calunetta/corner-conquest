import type { Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceIcon } from '@/components/icons';
import { Award, Swords } from 'lucide-react';

type PlayerInfoProps = {
  player: Player;
  isCurrentPlayer: boolean;
};

const playerColorMap = {
  blue: 'border-blue-500',
  red: 'border-red-500',
  green: 'border-green-500',
  yellow: 'border-yellow-400',
}

export function PlayerInfo({ player, isCurrentPlayer }: PlayerInfoProps) {
  return (
    <Card className={`transition-all duration-300 ${isCurrentPlayer ? `border-accent shadow-lg shadow-accent/20` : ''}`}>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-2">
        <CardTitle className="text-sm font-medium">{player.name}</CardTitle>
        <Badge variant="outline" className={`border-2 ${playerColorMap[player.color]}`}>{player.color.toUpperCase()}</Badge>
      </CardHeader>
      <CardContent className="flex items-center justify-between p-2 pt-0">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
                <Award className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-bold">{player.victoryPoints}</span>
            </div>
            <div className="flex items-center gap-1">
                <Swords className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-bold">{player.armySize}</span>
            </div>
        </div>
        <div className="flex gap-2 text-xs">
          {Object.entries(player.resources).map(([type, value]) => (
            <div key={type} className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5">
              <ResourceIcon type={type as keyof Player['resources']} className="h-3 w-3 text-muted-foreground" />
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
