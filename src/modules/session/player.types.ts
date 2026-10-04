export interface PlayerContextType {
  playerId: string | null;
  username: string | null;
  setUsername: (name: string) => Promise<boolean>;
  logout: () => void;
}
