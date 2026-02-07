import { MAP, getRoomAt, gridToPixel, pixelToGrid, getObjectsInRoom } from './map.js';
import { initNetwork, broadcast, updatePlayerData, getRoomData, cleanup } from './network.js';
import { database, ref, onValue, update } from './firebase.js';

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
const playerId = urlParams.get('player');
const isGranny = urlParams.get('granny') === 'true';

let canvas, ctx;
let keys = {};
let players = {};
let currentFloor = 1;
let gameTime = 120;
let gameTimer = null;
let isGameActive = false;
let isHiding = false;
let hidingSpot = null;

const player = {
    id: playerId,
    x: 5 * MAP.gridSize,
    y: 12 * MAP.gridSize,
    width: 30,
    height: 30,
    color: isGranny ? '#ff0000' : '#00a8ff',
    name: `Игрок_${playerId.substring(0, 4)}`,
    isGranny: isGranny,
    floor: 1,
    hidden: false,
    caught: false,
    lastUpdate: Date.now()
};

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = MAP.width * MAP.gridSize;
    canvas.height = MAP.height * MAP.gridSize;
    
    document.getElementById('roleText').textContent = isGranny ? 'Granny 👵' : 'Выживший 🏃';
    document.getElementById('roleText').style.color = isGranny ? '#ff4757' : '#00ff88';
    
    initNetwork(roomId, playerId);
    loadRoomData();
    startGame();
    setupControls();
    requestAnimationFrame(gameLoop);
    
    window.addEventListener('beforeunload', cleanup);
});

function loadRoomData() {
    getRoomData((snapshot) => {
        const data = snapshot.val();
        if (!data) {
            endGame('Комната удалена!');
            return;
        }
        
        if (data.timer !== undefined) {
            gameTime = data.timer;
            document.getElementById('timer').textContent = gameTime;
        }
        
        const playerCount = data.players ? Object.keys(data.players).length : 0;
        document.getElementById('playersCount').textContent = playerCount;
        
        if (data.gameOver) {
            endGame(data.gameResult || 'Игра окончена!', data.winner);
        }
    });
}

function startGame() {
    isGameActive = true;
    
    gameTimer = setInterval(() => {
        if (!isGameActive) return;
        
        gameTime--;
        document.getElementById('timer').textContent = gameTime;
        
        const roomRef = ref(database, `rooms/${roomId}`);
        update(roomRef, { timer: gameTime });
        
        if (gameTime <= 0) {
            endGame('Время вышло!', 'survivors');
        }
    }, 1000);
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        
        if (e.key === ' ' && !isHiding) {
            tryHide();
        }
        if (e.key === 'e') {
            interact();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    document.querySelectorAll('.d-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const key = btn.getAttribute('data-key');
            keys[key] = true;
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const key = btn.getAttribute('data-key');
            keys[key] = false;
        });
    });
    
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const action = btn.getAttribute('data-action');
            if (action === 'hide') {
                tryHide();
            } else if (action === 'interact') {
                interact();
            }
        });
    });
}

function tryHide() {
    const gridPos = pixelToGrid(player.x, player.y);
    const room = getRoomAt(gridPos.x, gridPos.y);
    
    if (!room) return;
    
    const roomObjects = getObjectsInRoom(room.id);
    const nearbyObject = roomObjects.find(obj => {
        const dist = Math.sqrt(
            Math.pow(obj.x - gridPos.x, 2) + 
            Math.pow(obj.y - gridPos.y, 2)
        );
        return dist < 2 && (obj.type === 'closet' || obj.type === 'bed' || obj.type === 'car');
    });
    
    if (nearbyObject) {
        isHiding = true;
        hidingSpot = nearbyObject;
        player.hidden = true;
        
        broadcast({
            type: 'playerAction',
            playerId: playerId,
            action: 'hide',
            data: { object: nearbyObject.type }
        });
        
        addLog(`${player.name} спрятался в ${getObjectName(nearbyObject.type)}!`);
    }
}

function interact() {
    if (isHiding) {
        isHiding = false;
        hidingSpot = null;
        player.hidden = false;
        
        broadcast({
            type: 'playerAction',
            playerId: playerId,
            action: 'unhide'
        });
        
        addLog(`${player.name} вышел из укрытия.`);
        return;
    }
    
    const gridPos = pixelToGrid(player.x, player.y);
    const room = getRoomAt(gridPos.x, gridPos.y);
    
    if (!room) return;
    
    const roomObjects = getObjectsInRoom(room.id);
    const nearbyObject = roomObjects.find(obj => {
        const dist = Math.sqrt(
            Math.pow(obj.x - gridPos.x, 2) + 
            Math.pow(obj.y - gridPos.y, 2)
        );
        return dist < 2;
    });
    
    if (nearbyObject) {
        handleObjectInteraction(nearbyObject);
    }
}

function handleObjectInteraction(obj) {
    switch (obj.type) {
        case 'door':
            if (obj.leadsTo === 'outside' && !obj.locked) {
                if (!player.isGranny) {
                    endGame('Выжившие сбежали!', 'survivors');
                }
            } else if (obj.locked) {
                addLog('Дверь заперта! Нужен ключ.');
            }
            break;
            
        case 'trap':
            if (!obj.active && !player.isGranny) {
                addLog(`${player.name} наступил на ловушку!`);
                broadcast({
                    type: 'gameEvent',
                    event: 'trapTriggered',
                    data: { playerId: playerId, x: obj.x, y: obj.y }
                });
            }
            break;
    }
}

function gameLoop() {
    if (!isGameActive) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawMap();
    
    if (!player.caught && (!isHiding || player.isGranny)) {
        handleMovement();
    }
    
    drawObjects();
    drawPlayers();
    drawPlayer();
    syncPlayerState();
    
    if (player.isGranny) {
        checkCatch();
    }
    
    requestAnimationFrame(gameLoop);
}

function drawMap() {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    MAP.rooms.forEach(room => {
        if (room.floor !== currentFloor) return;
        
        const pixel = gridToPixel(room.x, room.y);
        const size = { w: room.w * MAP.gridSize, h: room.h * MAP.gridSize };
        
        ctx.fillStyle = room.id === 'entrance' ? '#2a2a2a' : '#333';
        ctx.fillRect(pixel.x, pixel.y, size.w, size.h);
        
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(pixel.x, pixel.y, size.w, size.h);
        
        ctx.fillStyle = '#888';
        ctx.font = '12px Arial';
        ctx.fillText(room.name, pixel.x + 5, pixel.y + 15);
    });
}

function drawObjects() {
    MAP.objects.forEach(obj => {
        const room = MAP.rooms.find(r => r.id === obj.room);
        if (!room || room.floor !== currentFloor) return;
        
        const pixel = gridToPixel(obj.x, obj.y);
        
        switch (obj.type) {
            case 'door':
                ctx.fillStyle = obj.locked ? '#8B4513' : '#654321';
                ctx.fillRect(pixel.x, pixel.y, MAP.gridSize, MAP.gridSize);
                ctx.fillStyle = '#fff';
                ctx.fillText('🚪', pixel.x + 10, pixel.y + 25);
                break;
                
            case 'closet':
                ctx.fillStyle = '#5D4037';
                ctx.fillRect(pixel.x, pixel.y, MAP.gridSize, MAP.gridSize);
                ctx.fillStyle = '#fff';
                ctx.fillText('👕', pixel.x + 10, pixel.y + 25);
                break;
                
            case 'trap':
                if (obj.active) {
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(pixel.x + MAP.gridSize/2, pixel.y + MAP.gridSize/2, 15, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
    });
}

function drawPlayers() {
    Object.values(players).forEach(p => {
        if (p.id === playerId || p.floor !== currentFloor || p.caught) return;
        
        const pixel = gridToPixel(p.x, p.y);
        
        ctx.fillStyle = p.isGranny ? '#ff0000' : '#00a8ff';
        ctx.beginPath();
        ctx.arc(pixel.x + MAP.gridSize/2, pixel.y + MAP.gridSize/2, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.fillText(p.name, pixel.x - 10, pixel.y - 5);
        
        if (p.hidden) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(pixel.x - 5, pixel.y - 5, 50, 50);
        }
    });
}

function drawPlayer() {
    const pixel = { x: player.x, y: player.y };
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(pixel.x + 15, pixel.y + 40, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(pixel.x + 15, pixel.y + 15, 15, 0, Math.PI * 2);
    ctx.fill();
    
    if (player.hidden) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(pixel.x - 10, pixel.y - 10, 50, 50);
        ctx.fillStyle = '#fff';
        ctx.fillText('Спрятан', pixel.x, pixel.y - 15);
    }
    
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.fillText(`Этаж ${currentFloor}`, 10, 20);
}

function handleMovement() {
    const speed = player.isGranny ? 2 : 3;
    let moved = false;
    
    if (keys['w'] || keys['arrowup']) {
        player.y -= speed;
        moved = true;
    }
    if (keys['s'] || keys['arrowdown']) {
        player.y += speed;
        moved = true;
    }
    if (keys['a'] || keys['arrowleft']) {
        player.x -= speed;
        moved = true;
    }
    if (keys['d'] || keys['arrowright']) {
        player.x += speed;
        moved = true;
    }
    
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    
    if (moved) {
        checkFloorChange();
    }
}

function checkFloorChange() {
    const gridPos = pixelToGrid(player.x, player.y);
    
    MAP.objects.forEach(obj => {
        if (obj.type === 'stairs' && obj.x === gridPos.x && obj.y === gridPos.y) {
            currentFloor = currentFloor === 1 ? 2 : 1;
            addLog(`Перешел на ${currentFloor} этаж`);
            
            if (currentFloor === 2) {
                player.x = 8 * MAP.gridSize;
                player.y = 2 * MAP.gridSize;
            } else {
                player.x = 8 * MAP.gridSize;
                player.y = 11 * MAP.gridSize;
            }
        }
    });
}

function checkCatch() {
    Object.values(players).forEach(p => {
        if (p.isGranny || p.caught || p.hidden || p.floor !== currentFloor) return;
        
        const dist = Math.sqrt(
            Math.pow(player.x - p.x, 2) + 
            Math.pow(player.y - p.y, 2)
        );
        
        if (dist < 30) {
            p.caught = true;
            
            broadcast({
                type: 'gameEvent',
                event: 'playerCaught',
                data: { caughtPlayerId: p.id, by: playerId }
            });
            
            addLog(`${p.name} пойман Granny!`);
            checkGameEnd();
        }
    });
}

function syncPlayerState() {
    if (Date.now() - player.lastUpdate < 100) return;
    
    player.lastUpdate = Date.now();
    
    broadcast({
        type: 'playerState',
        playerId: playerId,
        data: {
            x: player.x,
            y: player.y,
            floor: currentFloor,
            hidden: player.hidden,
            caught: player.caught
        }
    });
    
    updatePlayerData({
        x: player.x,
        y: player.y,
        floor: currentFloor,
        hidden: player.hidden,
        caught: player.caught,
        lastSeen: Date.now()
    });
}

window.gameState = {
    updatePlayer: function(id, data) {
        if (!players[id]) {
            players[id] = { id, name: `Игрок_${id.substring(0, 4)}`, isGranny: false };
        }
        Object.assign(players[id], data);
    },
    
    handlePlayerAction: function(id, action, data) {
        if (action === 'hide') {
            addLog(`${players[id]?.name || 'Игрок'} спрятался.`);
        } else if (action === 'unhide') {
            addLog(`${players[id]?.name || 'Игрок'} вышел из укрытия.`);
        }
    },
    
    handleGameEvent: function(event, data) {
        if (event === 'playerCaught') {
            if (players[data.caughtPlayerId]) {
                players[data.caughtPlayerId].caught = true;
            }
            addLog(`${players[data.caughtPlayerId]?.name || 'Игрок'} пойман!`);
            checkGameEnd();
        }
    },
    
    getPlayerData: function() {
        return {
            x: player.x,
            y: player.y,
            floor: currentFloor,
            hidden: player.hidden
        };
    }
};

function checkGameEnd() {
    const survivors = Object.values(players).filter(p => !p.isGranny && !p.caught);
    
    if (survivors.length === 0) {
        endGame('Granny победила! Все пойманы.', 'granny');
    }
}

function endGame(message, winner) {
    isGameActive = false;
    clearInterval(gameTimer);
    
    const roomRef = ref(database, `rooms/${roomId}`);
    update(roomRef, {
        gameOver: true,
        gameResult: message,
        winner: winner
    });
    
    setTimeout(() => {
        document.getElementById('resultTitle').textContent = 
            winner === 'granny' ? 'Granny победила!' : 'Выжившие победили!';
        document.getElementById('resultText').textContent = message;
        document.getElementById('resultModal').style.display = 'flex';
    }, 1000);
}

function addLog(message) {
    const log = document.getElementById('gameLog');
    const p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString().slice(0,5)}] ${message}`;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
}

function getObjectName(type) {
    const names = {
        closet: 'шкаф',
        bed: 'кровать',
        car: 'машина',
        sofa: 'диван',
        refrigerator: 'холодильник'
    };
    return names[type] || 'объект';
}
