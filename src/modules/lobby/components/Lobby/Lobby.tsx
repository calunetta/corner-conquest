'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Compass, Loader2, Swords, Trophy, Shield, BookOpen, Sparkles, Power } from 'lucide-react';
import { LobbyBackground } from '../LobbyBackground';
import { CreateGameDialog } from '../CreateGameDialog';
import { LobbyGameRow } from '../LobbyGameRow';
import { useLobby } from './Lobby.hook';
import { styles } from './Lobby.styles';
import type { LobbyProps, LobbyViewModel } from './Lobby.types';

export function LobbyView(model: LobbyViewModel) {
  return (
    <div className={styles.root}>
      <LobbyBackground />
      <Card className={styles.card}>
        <CardHeader className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <Compass className={styles.headerCompass} />
              </div>
              <div>
                <div className={styles.headerTitleContainer}>
                  <CardTitle className={styles.headerTitle}>Game Lobby</CardTitle>
                  <Badge variant="outline" className={styles.headerBadge}>
                    <Sparkles className="h-3 w-3" /> Corner Conquest
                  </Badge>
                </div>
                <CardDescription className={styles.headerDescription}>
                  Conquer the archipelago, battle wild monsters, and out-maneuver rival commanders.
                </CardDescription>
              </div>
            </div>
            <div className={styles.headerRight}>
              <div className={styles.playerInfo}>
                <span className={styles.playerLabel}>Commander</span>
                <span className={styles.playerGreeting}>Welcome, {model.username}!</span>
              </div>
              <Button variant="ghost" size="sm" onClick={model.onLogout} className={styles.logoutButton}>
                <Power className="h-4 w-4 mr-1.5" /> Logout
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className={styles.content}>
          <div className={styles.leftColumn}>
            <div className={styles.createHero}>
              <div className={styles.createHeroHeader}>
                <span className={styles.createHeroLabel}>New Campaign</span>
                <Badge className={styles.createHeroBadge}>Host Match</Badge>
              </div>
              <p className={styles.createHeroDescription}>
                Create a customized match with bots, fog of war, custom victory point goals, and special ability cards.
              </p>
              <Button onClick={() => model.onCreateDialogChange(true)} disabled={model.isJoiningGame !== null}
                className={styles.createButton}>
                {model.isJoiningGame && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!model.isJoiningGame && <Swords className="mr-2 h-4 w-4" />}
                Create New Game
              </Button>
            </div>
            <div className={styles.tacticalGuide}>
              <div className={styles.tacticalHeader}>
                <BookOpen className={styles.tacticalHeaderIcon} />
                <span>Tactical Field Guide</span>
              </div>
              <div className={styles.tacticalContent}>
                <div className={styles.tacticalItem}>
                  <Trophy className={`${styles.tacticalItemIcon} text-yellow-400`} />
                  <p><strong className="text-foreground">Victory Point Goal:</strong> Earn VP by discovering islands, upgrading armies, and winning battles.</p>
                </div>
                <div className={styles.tacticalItem}>
                  <Shield className={`${styles.tacticalItemIcon} text-blue-400`} />
                  <p><strong className="text-foreground">Positioning:</strong> Position armies on resource islands to gather food, wood, and gold every turn.</p>
                </div>
                <div className={styles.tacticalItem}>
                  <Sparkles className={`${styles.tacticalItemIcon} text-purple-400`} />
                  <p><strong className="text-foreground">Special Cards:</strong> Teleport across the sea, scout unknown fog, or sabotage opponent armies.</p>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.rightColumn}>
            <div className={styles.roomsHeader}>
              <div className={styles.roomsHeaderLeft}>
                <h3 className={styles.roomsTitle}>Active Conquest Rooms</h3>
                <Badge className={styles.roomsCountBadge}>
                  {model.games.length} {model.games.length === 1 ? 'Open Room' : 'Open Rooms'}
                </Badge>
              </div>
              <span className={styles.roomsHint}>Click any match to join</span>
            </div>
            <div className={styles.gamesList}>
              {model.isGamesLoading && (
                <div className={styles.loadingState}>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm">Scanning tactical channels for open games...</span>
                </div>
              )}
              {!model.isGamesLoading && model.games.length === 0 && (
                <div className={styles.emptyState}>
                  <Compass className={styles.emptyIcon} />
                  <p className={styles.emptyTitle}>No open matches currently waiting.</p>
                  <p className={styles.emptyDescription}>
                    Be the first commander to launch a match and challenge players or bots!
                  </p>
                </div>
              )}
              {!model.isGamesLoading && model.games.length > 0 && (
                <TooltipProvider>
                  {model.games.map((game) => (
                    <LobbyGameRow
                      key={game.id}
                      game={game}
                      isJoining={model.isJoiningGame === game.id}
                      isAnyJoining={model.isJoiningGame !== null}
                      onJoin={model.onJoinGame}
                    />
                  ))}
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <CreateGameDialog open={model.isCreateDialogOpen} onOpenChange={model.onCreateDialogChange} onCreateGame={model.onCreateGame} />
    </div>
  );
}

export function Lobby({ onJoinGame }: LobbyProps) {
  return <LobbyView {...useLobby({ onJoinGame })} />;
}
