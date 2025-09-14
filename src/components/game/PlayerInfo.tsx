import type { Player } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResourceIcon } from '@/components/icons';
import { Shield, Swords, Award } from 'lucide-react';

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
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{player.name}</CardTitle>
        <Badge variant="outline" className={`border-2 ${playerColorMap[player.color]}`}>{player.color.toUpperCase()}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-2xl font-bold">
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6 text-yellow-400" />
            <span>{player.victoryPoints}</span>
          </div>
          <div className="flex items-center gap-2">
            <Swords className="h-6 w-6 text-gray-400" />
            <span>{player.armySize}</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {Object.entries(player.resources).map(([type, value]) => (
            <div key={type} className="flex items-center gap-2 rounded-md bg-muted p-2">
              <ResourceIcon type={type as keyof Player['resources']} className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
