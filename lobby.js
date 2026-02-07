import { database, ref, set, onValue, push, update, remove } from './firebase.js';

let currentRoomId = null;
let playerId = Math.random().toString(36).substring(2, 10);
let isGranny = false;

function createRoom() {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    currentRoomId = roomId;
    
    const roomRef = ref(database, 'rooms/' + roomId);
    set(roomRef, {
        players: {
            [playerId]: {
                name: 'Игрок_' + playerId.substring(0, 4),
                isGranny: false,
                ready: false,
                joinedAt: Date.now()
            }
        },
        status: 'waiting',
        createdAt: Date.now(),
        maxPlayers: 5
    }).then(() => {
        document.getElementById('roomId').textContent = roomId;
        document.getElementById('roomInfo').style.display = 'block';
        setupRoomListeners(roomId);
    }).catch(error => {
        console.error("Ошибка создания комнаты:", error);
    });
}

function joinRoom() {
    const roomId = document.getElementById('roomCode').value.trim().toUpperCase();
    if (!roomId) return alert('Введите код комнаты!');
    
    currentRoomId = roomId;
    const roomRef = ref(database, 'rooms/' + roomId);
    
    onValue(roomRef, (snapshot) => {
        if (!snapshot.exists()) {
            alert('Комната не найдена!');
            return;
        }
        
        const data = snapshot.val();
        if (data.status !== 'waiting') {
            alert('Игра уже началась!');
            return;
        }
        
        const updates = {};
        updates[`players/${playerId}`] = {
            name: 'Игрок_' + playerId.substring(0, 4),
            isGranny: false,
            ready: false,
            joinedAt: Date.now()
        };
        
        update(roomRef, updates).then(() => {
            document.getElementById('roomId').textContent = roomId;
            document.getElementById('roomInfo').style.display = 'block';
            setupRoomListeners(roomId);
        });
    });
}

function setupRoomListeners(roomId) {
    const roomRef = ref(database, 'rooms/' + roomId);
    
    onValue(roomRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            alert('Комната удалена!');
            window.location.reload();
            return;
        }
        
        const players = data.players || {};
        const playerCount = Object.keys(players).length;
        
        document.getElementById('playerCount').textContent = playerCount;
        
        document.getElementById('startBtn').disabled = playerCount < 2;
        document.getElementById('startBtn').textContent = 
            playerCount < 2 ? 'Начать игру (ждем игроков...)' : 'Начать игру!';
        
        if (data.status === 'playing') {
            for (const [id, player] of Object.entries(players)) {
                if (player.isGranny) {
                    isGranny = (id === playerId);
                    break;
                }
            }
            window.location.href = `game.html?room=${roomId}&player=${playerId}&granny=${isGranny}`;
        }
    });
}

function startGame() {
    if (!currentRoomId) return;
    
    const roomRef = ref(database, 'rooms/' + currentRoomId);
    const playersRef = ref(database, 'rooms/' + currentRoomId + '/players');
    
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (!players) return;
        
        const playerIds = Object.keys(players);
        const grannyId = playerIds[Math.floor(Math.random() * playerIds.length)];
        
        const updates = {};
        playerIds.forEach(id => {
            updates[`players/${id}/isGranny`] = (id === grannyId);
        });
        
        updates['status'] = 'playing';
        updates['startedAt'] = Date.now();
        updates['timer'] = 120;
        
        update(roomRef, updates);
    }, { onlyOnce: true });
}

window.createRoom = createRoom;
window.joinRoom = joinRoom;
window.startGame = startGame;
