
import { PlayerColor } from './types';

export const PLAYER_COLORS: PlayerColor[] = ['blue', 'red', 'purple', 'yellow'];

type PlayerSpriteInfo = {
    idle: string;
    attack: string;
    death: string;
}

type PlayerData = {
    name: string;
    sprite: PlayerSpriteInfo;
    base: string;
}

export const PLAYER_DATA: Record<PlayerColor, PlayerData> = {
    blue: {
        name: 'The Legionnaires',
        sprite: {
            idle: '/sprites/blue.gif',
            attack: '/sprites/blue_attack.gif',
            death: '/sprites/death.gif',
        },
        base: '/sprites/castle_blue.png',
    },
    red: {
        name: 'The Praetorians',
        sprite: {
            idle: '/sprites/red.gif',
            attack: '/sprites/red_attack.gif',
            death: '/sprites/death.gif',
        },
        base: '/sprites/castle_red.png',
    },
    purple: {
        name: 'The Hoplites',
        sprite: {
            idle: '/sprites/purple.gif',
            attack: '/sprites/purple_attack.gif',
            death: '/sprites/death.gif',
        },
        base: '/sprites/castle_purple.png',
    },
    yellow: {
        name: 'The Immortals',
        sprite: {
            idle: '/sprites/yellow.gif',
            attack: '/sprites/yellow_attack.gif',
            death: '/sprites/death.gif',
        },
        base: '/sprites/castle_yellow.png',
    }
};
