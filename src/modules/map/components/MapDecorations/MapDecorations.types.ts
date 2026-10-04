export interface RockDef {
  id: string;
  src: string;
  left: string;
  top: string;
  size: number;
  desktopOnly?: boolean;
}

export interface CloudDef {
  id: string;
  src: string;
  left: string;
  top: string;
  width: number;
  height: number;
  opacity?: number;
  desktopOnly?: boolean;
}

export interface MapDecorationsProps {
  isMobile?: boolean;
}
