const ioHook = require('iohook')
import { Key } from './types'

const myShortcut = [67];

type State = {
    enabled: boolean
};


const state: State = {
    enabled: true
}

ioHook.registerShortcut(myShortcut, (_keys: Key[]) => {
    state.enabled = !state.enabled
})

setInterval(() => {
    console.log(state)
}, 2000)

ioHook.start()
