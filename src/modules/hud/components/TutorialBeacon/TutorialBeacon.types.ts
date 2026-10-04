export interface TutorialBeaconProps {
  id: string; // unique ID to track if this beacon has been seen
  title: string;
  description: React.ReactNode;
  className?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}
