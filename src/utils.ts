import { GameState } from './types';

export function shouldMute(state: GameState): boolean {
    return state === 'tasks';
}
