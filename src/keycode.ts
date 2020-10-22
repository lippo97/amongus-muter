import { KeyEvent } from './types'
const ioHook = require('iohook')

ioHook.on('keydown', (event: KeyEvent<'keydown'>) => {
    console.log(event.keycode)
});

ioHook.start();
