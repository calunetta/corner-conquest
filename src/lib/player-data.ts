import { PlayerColor } from './types';

export const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'purple', 'yellow'];

type PlayerSpriteInfo = {
    idle: string;
    attack: string;
}

type PlayerData = {
    name: string;
    sprite: PlayerSpriteInfo;
}

export const PLAYER_DATA: Record<PlayerColor, PlayerData> = {
    blue: {
        name: 'The Legionnaires',
        sprite: {
            idle: '/sprites/blue.gif',
            attack: '/sprites/blue_attack.gif',
        }
    },
    red: {
        name: 'The Praetorians',
        sprite: {
            idle: '/sprites/red.gif',
            attack: '/sprites/red_attack.gif',
        }
    },
    purple: {
        name: 'The Hoplites',
        sprite: {
            idle: '/sprites/purple.gif',
            attack: '/sprites/purple_attack.gif',
        }
    },
    yellow: {
        name: 'The Immortals',
        sprite: {
            idle: '/sprites/yellow.gif',
            attack: '/sprites/yellow_attack.gif',
        }
    }
};

export const PLAYER_SPRITES = {
    blue: PLAYER_DATA.blue.sprite,
    red: PLAYER_DATA.red.sprite,
    purple: PLAYER_DATA.purple.sprite,
    yellow: PLAYER_DATA.yellow.sprite,
};
