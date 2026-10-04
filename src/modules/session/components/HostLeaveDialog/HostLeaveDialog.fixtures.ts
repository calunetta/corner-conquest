import type { HostLeaveDialogProps } from './HostLeaveDialog.types';
import { GameStatus } from '@/lib/types';

const noop = () => undefined;
const noopAsync = async () => undefined;

/** In-progress game: leaving closes the room for everyone. */
export const inProgressProps: HostLeaveDialogProps = {
  open: true,
  onClose: noop,
  onConfirm: noopAsync,
  isLastPlayer: false,
  gameStatus: GameStatus.Playing,
};

/** Last player remaining in the lobby: leaving dismantles the room. */
export const lastPlayerProps: HostLeaveDialogProps = {
  open: true,
  onClose: noop,
  onConfirm: noopAsync,
  isLastPlayer: true,
  gameStatus: GameStatus.Waiting,
};

/** Mid-lobby with other players present: leaving hands off to the next host. */
export const newHostTakesOverProps: HostLeaveDialogProps = {
  open: true,
  onClose: noop,
  onConfirm: noopAsync,
  isLastPlayer: false,
  gameStatus: GameStatus.Waiting,
};
