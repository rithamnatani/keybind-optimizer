import { KeyDef } from './types';

const DEFAULT_KEY_HEIGHT = 4;

export interface Point {
    x: number;
    y: number;
}

/** Returns the center point of a key in 0.25u coordinate space. */
export function getKeyCenter(key: KeyDef): Point {
    return {
        x: key.x + key.width / 2,
        y: key.y + (key.height ?? DEFAULT_KEY_HEIGHT) / 2,
    };
}

/** Calculates Euclidean distance between two points. */
export function euclidean(pointA: Point, pointB: Point): number {
    const deltaX = pointA.x - pointB.x;
    const deltaY = pointA.y - pointB.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

/** Calculates center-to-center distance between two keys. Returns 0 for same key. */
export function keyDistance(keyA: KeyDef, keyB: KeyDef): number {
    if (keyA.code === keyB.code) return 0;
    return euclidean(getKeyCenter(keyA), getKeyCenter(keyB));
}

/** Returns keys sorted by center X coordinate for spatial search optimization. */
export function sortKeysByX(keys: KeyDef[]): KeyDef[] {
    return [...keys].sort((a, b) => getKeyCenter(a).x - getKeyCenter(b).x);
}

/** Creates a Map from key code to KeyDef for O(1) lookups. */
export function buildKeyMap(keys: KeyDef[]): Map<string, KeyDef> {
    return new Map(keys.map(key => [key.code, key]));
}
