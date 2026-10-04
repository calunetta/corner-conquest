export type Sprite = {
  src: string;
  alt: string;
  width: number;
  height: number;
  imageClassName: string;
};

export type SpriteDecoration = Sprite & {
  positionClassName: string;
};

export type LobbyIsland = {
  id: string;
  /** Position + visibility + hover + animation-duration/delay classes. */
  wrapperClassName: string;
  /** Size + border-color + rotate classes. */
  cardClassName: string;
  mainSprite: Sprite;
  decorations: SpriteDecoration[];
};

export type LobbyBoat = {
  id: string;
  wrapperClassName: string;
  sprite: Sprite;
};
