import { database, ref, onValue, update, remove } from './firebase.js';

let peer = null;
let connections = {};
let roomId = null;
let playerId = null;

// Инициализация PeerJS
export function initNetwork(room, player) {
    roomId = room;
    playerId = player;
    
    // Создаем Peer с уникальным ID
    peer = new Peer(`granny-${roomId}-${playerId}`, {
        debug: 0,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });
    
    peer.on('open', (id) => {
        console.log('Peer подключен:', id);
        // Сохраняем наш peerId в Firebase
        updatePlayerData({ peerId: id });
    });
    
    peer.on('connection', (conn) => {
        console.log('Новое подключение:', conn.peer);
        setupConnection(conn);
    });
    
    peer.on('error', (err) => {
        console.error('PeerJS ошибка:', err);
    });
    
    // Слушаем других игроков в комнате
    listenForPlayers();
}

// Слушаем добавление новых игроков
function listenForPlayers() {
    const playersRef = ref(database, `rooms/${roomId}/players`);
    
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (!players) return;
        
        Object.entries(players).forEach(([id, data]) => {
            if (id !== playerId && data.peerId && !connections[id]) {
                connectToPlayer(id, data.peerId);
            }
        });
    });
}

// Подключаемся к другому игроку
function connectToPlayer(playerId, peerId) {
    const conn = peer.connect(peerId, { reliable: true });
    setupConnection(conn, playerId);
}

// Настройка соединения
function setupConnection(conn, targetPlayerId = null) {
    const pid = targetPlayerId || conn.peer.split('-')[2];
    
    conn.on('open', () => {
        console.log(`Соединение с ${pid} открыто`);
        connections[pid] = conn;
        
        // Отправляем наше начальное состояние
        conn.send({
            type: 'playerState',
            playerId: playerId,
            data: window.gameState ? window.gameState.getPlayerData() : {}
        });
    });
    
    conn.on('data', (data) => {
        handleNetworkData(data);
    });
    
    conn.on('close', () => {
        console.log(`Соединение с ${pid} закрыто`);
        delete connections[pid];
    });
    
    conn.on('error', (err) => {
        console.error(`Ошибка соединения с ${pid}:`, err);
    });
}

// Отправка данных всем игрокам
export function broadcast(data) {
    Object.values(connections).forEach(conn => {
        if (conn.open) {
            conn.send(data);
        }
    });
}

// Отправка данных конкретному игроку
export function sendTo(playerId, data) {
    if (connections[playerId] && connections[playerId].open) {
        connections[playerId].send(data);
    }
}

// Обработка входящих данных
function handleNetworkData(data) {
    switch (data.type) {
        case 'playerState':
            if (window.gameState) {
                window.gameState.updatePlayer(data.playerId, data.data);
            }
            break;
            
        case 'playerAction':
            if (window.gameState) {
                window.gameState.handlePlayerAction(data.playerId, data.action, data.data);
            }
            break;
            
        case 'gameEvent':
            if (window.gameState) {
                window.gameState.handleGameEvent(data.event, data.data);
            }
            break;
    }
}

// Обновление данных игрока в Firebase
export function updatePlayerData(data) {
    const playerRef = ref(database, `rooms/${roomId}/players/${playerId}`);
    update(playerRef, data);
}

// Получение данных комнаты
export function getRoomData(callback) {
    const roomRef = ref(database, `rooms/${roomId}`);
    return onValue(roomRef, callback);
}

// Удаление игрока при выходе
export function cleanup() {
    if (roomId && playerId) {
        const playerRef = ref(database, `rooms/${roomId}/players/${playerId}`);
        remove(playerRef);
    }
    
    Object.values(connections).forEach(conn => conn.close());
    if (peer) peer.destroy();
}
