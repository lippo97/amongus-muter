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
