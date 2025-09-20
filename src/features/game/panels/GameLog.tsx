
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type GameLogProps = {
  logs: string[];
};

export function GameLog({ logs }: GameLogProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Log</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 w-full">
          <div className="space-y-2 pr-4">
            {logs.map((log, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                {log}
              </p>
            )).reverse()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
