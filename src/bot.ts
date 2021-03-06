import Discord, { GuildMember } from 'discord.js';
import { config } from 'dotenv';
import * as E from 'fp-ts/lib/Either';
import { Either } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/function';
import * as O from 'fp-ts/lib/Option';
import { Option } from 'fp-ts/lib/Option';
import * as TE from 'fp-ts/lib/TaskEither';
import ioHook from 'iohook';
import mqtt from 'async-mqtt';
import { Connection, GameState, State } from './types';
import { shouldMute } from './utils';

/*
 * Load environment variables and early exit.
 */
config();

const MQTT_PROCOL = 'tcp'
const MQTT_HOST = process.env.HOST || 'localhost';
const MQTT_PORT = parseInt(process.env.PORT || '1883');
const MQTT_URI = `${MQTT_PROCOL}://${MQTT_HOST}:${MQTT_PORT}`;

const GAME_STATE = 'gameState';
const LOBBY_CODE = 'lobbyCode';
const TOKEN = process.env.DISCORD_TOKEN
const myShortcut = [parseInt(process.env.ENABLE_SHORTCUT) || 67];

if (TOKEN === undefined) {
    console.error('Couldn\'t find environment variable DISCORD_TOKEN.')
    process.exit(1)
}


const state: State = {
    enabled: true,
    muted: false,
    connection: O.none,
}

const getOperations = (state: State) => ({ members }: Discord.VoiceChannel) => {
    const refresh = () => {
        const { enabled, muted } = state;
        console.log(`Refreshing state: ${JSON.stringify({ enabled, muted })}`);
        return Promise.all(
            members.map(m => m.voice.setMute(state.enabled && state.muted))
        )
    };

    return {
        setEnabled: (enabled: boolean) => {
            state.enabled = enabled;
            return refresh();
        },
        toggleEnabled: () => {
            state.enabled = !state.enabled;
            return refresh();
        },
        setMuted: (muted: boolean) => {
            state.muted = muted;
            return refresh();
        }
    }
}

async function startGame(message: Discord.Message): Promise<void> {

    const startGameActions = async (c: Discord.VoiceChannel) => {
        const { toggleEnabled, setMuted } = getOperations(state)(c);

        const mqttClient = await mqtt.connectAsync(MQTT_URI);
        await mqttClient.subscribe([GAME_STATE, LOBBY_CODE]);

        const sendLobbyCode = (code: string) => message.reply(`Lobby: ${code}`)

        mqttClient.on('message', async (topic: string, msg: any) => {
            console.log(topic, msg.toString())
            // await toggleEnabled()
            if (topic === GAME_STATE) {
                const res = await pipe(
                    (msg.toString() as string).toLowerCase() as GameState,
                    TE.right,
                    TE.map(shouldMute),
                    TE.chain(
                        (muted) => TE.tryCatch(() => setMuted(muted), E.toError),
                    )
                )()
                E.mapLeft(err => message.reply(err))(res)
            } else if (topic === LOBBY_CODE) {
                const res = await pipe(
                    (msg.toString() as string),
                    TE.right,
                    TE.chain((code) => TE.tryCatch(() => sendLobbyCode(code), E.toError)),
                )()
                E.mapLeft(err => message.reply(err))(res)
            }
        })

        ioHook.start();
        return Promise.all([
            mqttClient,
            ioHook.registerShortcut(myShortcut, () => toggleEnabled()),
            c.join()
        ]);
    }

    const channel: Either<Error, Connection> = await pipe(
        O.fromNullable(message.member.voice.channel),
        TE.fromOption(() => new Error('You need to join a voice channel first!')),
        TE.chain((c) => TE.tryCatch(
            () => startGameActions(c),
            E.toError
        )),
    )();

    E.mapLeft(err => message.reply(err))(channel)
    state.connection = O.fromEither(channel)
}

async function endGame(message: Discord.Message): Promise<void> {

    const endGameActions = (c: Discord.VoiceChannel) => {
        const { setMuted } = getOperations(state)(c);
        return setMuted(false);
    }

    pipe(
        await pipe(
            O.fromNullable(message.member.voice.channel),
            TE.fromOption(() => new Error('You need to join a voice channel first!')),
            TE.chain((c) => TE.tryCatch(
                () => endGameActions(c).then(() => {}),
                E.toError
            )),
        )(),
        E.mapLeft(err => message.reply(err.message)),
    )

    pipe(
        state.connection,
        O.map(([mqttClient, ioHookId, voiceConnection]) => {
            mqttClient.unsubscribe(GAME_STATE);
            ioHook.unregisterShortcut(ioHookId);
            voiceConnection.disconnect()
            ioHook.stop();
            return O.none;
        })
    )

    state.connection = O.none;
}

const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', async (message) => {
    if (!message.guild) return;
    if (message.content === '!game') {
        await startGame(message)
    } else if (message.content === '!endgame') {
        await endGame(message)
    }
});

client.login(process.env.DISCORD_TOKEN);
