import Discord from 'discord.js';
import { Option } from 'fp-ts/lib/Option';
import { MqttClient } from 'mqtt';

export type Key = number

export type KeyEvent<E> = {
    type: E,
    keycode: Key,
    rawcode: number,
    shiftKey: boolean,
    altKey: boolean,
    ctrlKey: boolean,
    metaKey: boolean,
}

export type Connection = [
    MqttClient,
    number,
    Discord.VoiceConnection
]

export type State = {
    enabled: boolean,
    muted: boolean,
    connection: Option<Connection>,
};

export type GameState = 'lobby' | 'tasks' | 'discussion' | 'menu';
