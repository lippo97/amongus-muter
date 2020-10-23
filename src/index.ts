const ioHook = require('iohook')
import { Key } from './types'

const myShortcut = [67];

type State = {
    enabled: boolean,

};

const state: State = {
    enabled: true
}

ioHook.registerShortcut(myShortcut, (_keys: Key[]) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve("fatto");
        }, 1000);
    }).then(o => console.log(o))
})

// setInterval(() => {
//     console.log(state)
// }, 2000)

ioHook.start()
