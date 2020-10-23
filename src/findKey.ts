const ioHook = require('iohook')

ioHook.on('keydown', event => {
  console.log(event); // { type: 'mousemove', x: 700, y: 400 }
});
