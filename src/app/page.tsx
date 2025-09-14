import { GameBoard } from '@/components/game/GameBoard';

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <GameBoard />
    </div>
  );
}
