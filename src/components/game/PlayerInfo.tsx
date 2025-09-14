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
      <CardHeader className="flex-row items-center justify-between space-y-0 p-3">
        <CardTitle className="text-sm font-medium">{player.name}</CardTitle>
        <Badge variant="outline" className={`border-2 ${playerColorMap[player.color]}`}>{player.color.toUpperCase()}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <div className="flex items-center justify-between text-lg font-bold">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-400" />
            <span>{player.victoryPoints}</span>
          </div>
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-gray-400" />
            <span>{player.armySize}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {Object.entries(player.resources).map(([type, value]) => (
            <div key={type} className="flex items-center gap-1 rounded-md bg-muted p-1">
              <ResourceIcon type={type as keyof Player['resources']} className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
