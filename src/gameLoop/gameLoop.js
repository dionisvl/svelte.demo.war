import { isPlaying } from '../stores/game';
import { get } from 'svelte/store';
import { rotateCannon, shoot, moveBullet, clearBullets } from './cannon';
// импортируем обработчик столкновений
import { checkCollision } from './game';
import { addEnemy, moveEnemy } from './enemy';

function startLoop(steps) {
    window.requestAnimationFrame(() => {
        steps.forEach(step => {
            if (typeof step === 'function') step();
        });
        if (get(isPlaying)) startLoop(steps);
    });
}

export const startGame = () => {
    isPlaying.set(true);
    // добавим обработчик в игровой цикл
    startLoop([rotateCannon, shoot, moveBullet, clearBullets, addEnemy, moveEnemy, checkCollision]);
};

export function stopGame() {
    isPlaying.set(false);
}
