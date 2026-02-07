import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onValue, 
    update,
    remove,
    onDisconnect,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDHKz6YuGSYzyO-Sj6IS93C9mV0yX0Yfbg",
    authDomain: "grannymultiplayer.firebaseapp.com",
    projectId: "grannymultiplayer",
    storageBucket: "grannymultiplayer.firebasestorage.app",
    messagingSenderId: "678766098712",
    appId: "1:678766098712:web:5dd0ead1e54da25109866d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let currentUser = null;
let currentRoom = null;

// Вход через Google
export async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error("Ошибка входа:", error);
        throw error;
    }
}

// Выход
export function logout() {
    if (currentRoom) {
        leaveRoom();
    }
    return signOut(auth);
}

// Создание комнаты
export function createRoom() {
    if (!currentUser) return null;
    
    const roomRef = push(ref(database, 'rooms'));
    const roomId = roomRef.key;
    
    const roomData = {
        id: roomId,
        host: currentUser.uid,
        hostName: currentUser.displayName,
        players: {
            [currentUser.uid]: {
                name: currentUser.displayName,
                avatar: currentUser.photoURL,
                isGranny: false,
                ready: false,
                position: { x: 100, y: 100 }
            }
        },
        status: 'waiting',
        createdAt: serverTimestamp(),
        gameStartTime: null,
        currentGranny: null
    };
    
    set(roomRef, roomData);
    
    // Установить обработчик отключения
    const userRoomRef = ref(database, `rooms/${roomId}/players/${currentUser.uid}`);
    onDisconnect(userRoomRef).remove();
    
    currentRoom = roomId;
    return roomId;
}

// Присоединиться к комнате
export function joinRoom(roomId) {
    if (!currentUser || !roomId) return false;
    
    const playerRef = ref(database, `rooms/${roomId}/players/${currentUser.uid}`);
    
    const playerData = {
        name: currentUser.displayName,
        avatar: currentUser.photoURL,
        isGranny: false,
        ready: false,
        position: { x: 300, y: 300 }
    };
    
    set(playerRef, playerData);
    
    // Установить обработчик отключения
    onDisconnect(playerRef).remove();
    
    currentRoom = roomId;
    return true;
}

// Покинуть комнату
export function leaveRoom() {
    if (!currentUser || !currentRoom) return;
    
    const playerRef = ref(database, `rooms/${currentRoom}/players/${currentUser.uid}`);
    remove(playerRef);
    
    currentRoom = null;
}

// Начать игру
export function startGame() {
    if (!currentRoom || !currentUser) return;
    
    const roomRef = ref(database, `rooms/${currentRoom}`);
    const updates = {
        status: 'playing',
        gameStartTime: serverTimestamp(),
        currentGranny: selectRandomPlayer()
    };
    
    update(roomRef, updates);
}

// Обновить позицию игрока
export function updatePlayerPosition(position) {
    if (!currentUser || !currentRoom) return;
    
    const positionRef = ref(database, `rooms/${currentRoom}/players/${currentUser.uid}/position`);
    set(positionRef, position);
}

// Подписаться на изменения комнаты
export function subscribeToRoom(roomId, callback) {
    const roomRef = ref(database, `rooms/${roomId}`);
    return onValue(roomRef, (snapshot) => {
        callback(snapshot.val());
    });
}

// Подписаться на изменения игроков
export function subscribeToPlayers(roomId, callback) {
    const playersRef = ref(database, `rooms/${roomId}/players`);
    return onValue(playersRef, (snapshot) => {
        callback(snapshot.val());
    });
}

// Получить список комнат
export function subscribeToRooms(callback) {
    const roomsRef = ref(database, 'rooms');
    return onValue(roomsRef, (snapshot) => {
        const rooms = [];
        snapshot.forEach((childSnapshot) => {
            const room = childSnapshot.val();
            if (room.status === 'waiting') {
                rooms.push(room);
            }
        });
        callback(rooms);
    });
}

// Слушатель состояния авторизации
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        console.log("Пользователь вошел:", user.displayName);
    } else {
        console.log("Пользователь вышел");
    }
});

// Вспомогательная функция для выбора гренни
function selectRandomPlayer() {
    // В реальной реализации здесь будет логика выбора случайного игрока
    return null;
}

export { auth, currentUser, currentRoom };
