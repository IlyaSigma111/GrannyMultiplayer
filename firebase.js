// ==============================================
// firebase.js - УПРОЩЕННАЯ ВЕРСИЯ (без Google)
// ==============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onValue, 
    update,
    remove,
    onDisconnect,
    serverTimestamp,
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDHKz6YuGSYzyO-Sj6IS93C9mV0yX0Yfbg",
    authDomain: "grannymultiplayer.firebaseapp.com",
    projectId: "grannymultiplayer",
    storageBucket: "grannymultiplayer.firebasestorage.app",
    messagingSenderId: "678766098712",
    appId: "1:678766098712:web:5dd0ead1e54da25109866d",
    databaseURL: "https://grannymultiplayer-default-rtdb.firebaseio.com/"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Текущий пользователь (простой объект)
let currentUser = {
    id: null,
    name: 'Гость',
    color: '#4CAF50',
    isAnonymous: true,
    avatarLetter: 'Г'
};

let currentRoom = null;

// ==============================================
// СИСТЕМА ПОЛЬЗОВАТЕЛЯ
// ==============================================

/**
 * Создание пользователя
 */
export function createUser(username, color = '#4CAF50') {
    if (!username || username.trim().length < 3) {
        throw new Error('Имя должно быть от 3 символов');
    }
    
    // Генерируем ID
    const userId = generateUserId();
    
    // Создаем пользователя
    currentUser = {
        id: userId,
        name: username.trim(),
        color: color,
        isAnonymous: true,
        avatarLetter: getAvatarLetter(username),
        joinedAt: Date.now()
    };
    
    // Сохраняем в локальное хранилище
    saveUserToStorage();
    
    console.log('✅ Пользователь создан:', currentUser.name);
    return currentUser;
}

/**
 * Получение текущего пользователя
 */
export function getCurrentUser() {
    return { ...currentUser };
}

/**
 * Изменение профиля
 */
export function updateUserProfile(newName, newColor) {
    if (newName && newName.trim().length >= 3) {
        currentUser.name = newName.trim();
        currentUser.avatarLetter = getAvatarLetter(newName);
    }
    
    if (newColor) {
        currentUser.color = newColor;
    }
    
    saveUserToStorage();
    return currentUser;
}

/**
 * Сохранение в localStorage
 */
function saveUserToStorage() {
    try {
        localStorage.setItem('granny_user', JSON.stringify(currentUser));
        console.log('💾 Пользователь сохранен в localStorage');
    } catch (error) {
        console.warn('Не удалось сохранить пользователя:', error);
    }
}

/**
 * Загрузка из localStorage
 */
export function loadUserFromStorage() {
    try {
        const saved = localStorage.getItem('granny_user');
        if (saved) {
            const userData = JSON.parse(saved);
            currentUser = {
                ...currentUser,
                ...userData
            };
            console.log('📂 Пользователь загружен:', currentUser.name);
            return currentUser;
        }
    } catch (error) {
        console.warn('Ошибка загрузки пользователя:', error);
    }
    return null;
}

/**
 * Генерация ID пользователя
 */
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Получение первой буквы для аватара
 */
function getAvatarLetter(username) {
    return username.trim().charAt(0).toUpperCase();
}

// ==============================================
// СИСТЕМА КОМНАТ
// ==============================================

/**
 * Создание комнаты
 */
export async function createRoom() {
    if (!currentUser.id) {
        throw new Error('Пользователь не создан');
    }
    
    try {
        // Генерируем код комнаты
        const roomId = generateRoomCode();
        
        const roomRef = ref(database, `rooms/${roomId}`);
        
        const roomData = {
            id: roomId,
            host: currentUser.id,
            hostName: currentUser.name,
            hostColor: currentUser.color,
            settings: {
                roundTime: 120,
                grannyCount: 1,
                map: 'house',
                maxPlayers: 8
            },
            players: {
                [currentUser.id]: {
                    uid: currentUser.id,
                    name: currentUser.name,
                    color: currentUser.color,
                    avatarLetter: currentUser.avatarLetter,
                    isGranny: false,
                    ready: false,
                    position: { x: 100, y: 100 },
                    isHiding: false,
                    hidingSpotId: null,
                    caught: false,
                    joinedAt: serverTimestamp()
                }
            },
            status: 'waiting',
            createdAt: serverTimestamp(),
            gameStartTime: null,
            currentGrannies: []
        };
        
        await set(roomRef, roomData);
        
        // Настраиваем обработчик отключения
        await setupDisconnectHandler(roomId);
        
        currentRoom = roomId;
        
        // Добавляем в статистику
        await updateOnlineStats('room_created');
        
        console.log('✅ Комната создана:', roomId);
        return roomId;
        
    } catch (error) {
        console.error('❌ Ошибка создания комнаты:', error);
        throw error;
    }
}

/**
 * Присоединение к комнате
 */
export async function joinRoom(roomId) {
    if (!currentUser.id) {
        throw new Error('Пользователь не создан');
    }
    
    try {
        // Проверяем комнату
        const roomRef = ref(database, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) {
            throw new Error('Комната не найдена');
        }
        
        const roomData = snapshot.val();
        
        // Проверяем статус
        if (roomData.status !== 'waiting') {
            throw new Error('Игра уже началась');
        }
        
        // Проверяем количество игроков
        const playerCount = Object.keys(roomData.players || {}).length;
        if (playerCount >= roomData.settings?.maxPlayers) {
            throw new Error('Комната заполнена');
        }
        
        // Добавляем игрока
        const playerData = {
            uid: currentUser.id,
            name: currentUser.name,
            color: currentUser.color,
            avatarLetter: currentUser.avatarLetter,
            isGranny: false,
            ready: false,
            position: { x: 300, y: 300 },
            isHiding: false,
            hidingSpotId: null,
            caught: false,
            joinedAt: serverTimestamp()
        };
        
        await set(ref(database, `rooms/${roomId}/players/${currentUser.id}`), playerData);
        
        // Настраиваем обработчик отключения
        await setupDisconnectHandler(roomId);
        
        currentRoom = roomId;
        
        // Добавляем сообщение в чат
        await addChatMessage(roomId, 'system', `${currentUser.name} присоединился`);
        
        await updateOnlineStats('player_joined');
        
        console.log('✅ Присоединились к комнате:', roomId);
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка присоединения:', error);
        throw error;
    }
}

/**
 * Покинуть комнату
 */
export async function leaveRoom() {
    if (!currentRoom || !currentUser.id) return;
    
    try {
        const playerRef = ref(database, `rooms/${currentRoom}/players/${currentUser.id}`);
        const roomRef = ref(database, `rooms/${currentRoom}`);
        
        // Получаем данные комнаты
        const snapshot = await get(roomRef);
        if (!snapshot.exists()) return;
        
        const roomData = snapshot.val();
        
        // Если это хост
        if (roomData.host === currentUser.id) {
            const players = Object.keys(roomData.players || {});
            
            if (players.length > 1) {
                // Назначаем нового хоста
                const otherPlayers = players.filter(id => id !== currentUser.id);
                const newHostId = otherPlayers[0];
                const newHostData = roomData.players[newHostId];
                
                await update(roomRef, {
                    host: newHostId,
                    hostName: newHostData.name,
                    hostColor: newHostData.color
                });
                
                await addChatMessage(currentRoom, 'system', 
                    `${newHostData.name} теперь хост`);
            } else {
                // Удаляем комнату если хост один
                await remove(roomRef);
            }
        }
        
        // Удаляем игрока
        await remove(playerRef);
        
        // Добавляем сообщение
        await addChatMessage(currentRoom, 'system', 
            `${currentUser.name} покинул комнату`);
        
        currentRoom = null;
        
        await updateOnlineStats('player_left');
        
        console.log('✅ Покинули комнату');
        
    } catch (error) {
        console.error('❌ Ошибка выхода:', error);
    }
}

/**
 * Начать игру
 */
export async function startGame(roomId) {
    try {
        const roomRef = ref(database, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) {
            throw new Error('Комната не найдена');
        }
        
        const roomData = snapshot.val();
        
        // Проверяем что это хост
        if (roomData.host !== currentUser.id) {
            throw new Error('Только хост может начать игру');
        }
        
        if (roomData.status !== 'waiting') {
            throw new Error('Игра уже начата');
        }
        
        // Проверяем игроков
        const players = roomData.players || {};
        const playerIds = Object.keys(players);
        
        if (playerIds.length < 2) {
            throw new Error('Нужно минимум 2 игрока');
        }
        
        // Выбираем гренни
        const grannyCount = roomData.settings?.grannyCount || 1;
        const grannies = selectGrannies(players, grannyCount);
        
        // Обновляем состояние
        const updates = {};
        
        playerIds.forEach(playerId => {
            updates[`players/${playerId}/isGranny`] = grannies.includes(playerId);
            updates[`players/${playerId}/ready`] = false;
            updates[`players/${playerId}/caught`] = false;
            updates[`players/${playerId}/isHiding`] = false;
            updates[`players/${playerId}/hidingSpotId`] = null;
            
            // Стартовые позиции
            if (grannies.includes(playerId)) {
                updates[`players/${playerId}/position`] = { x: 100, y: 100 };
            } else {
                updates[`players/${playerId}/position`] = { 
                    x: 500 + Math.random() * 200, 
                    y: 300 + Math.random() * 200 
                };
            }
        });
        
        updates['status'] = 'playing';
        updates['gameStartTime'] = serverTimestamp();
        updates['currentGrannies'] = grannies;
        
        await update(roomRef, updates);
        
        // Сообщение в чат
        const grannyNames = grannies.map(id => players[id].name).join(', ');
        await addChatMessage(roomId, 'system', 
            `Игра началась! Гренни: ${grannyNames}`);
        
        console.log('🎮 Игра начата');
        
    } catch (error) {
        console.error('❌ Ошибка начала игры:', error);
        throw error;
    }
}

// ==============================================
// ИГРОВЫЕ ДЕЙСТВИЯ
// ==============================================

/**
 * Обновить позицию
 */
export async function updatePlayerPosition(roomId, position) {
    if (!currentUser.id || !roomId) return;
    
    try {
        const positionRef = ref(database, `rooms/${roomId}/players/${currentUser.id}/position`);
        await set(positionRef, {
            ...position,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('❌ Ошибка обновления позиции:', error);
    }
}

/**
 * Обновить готовность
 */
export async function updatePlayerReady(roomId, isReady) {
    try {
        const readyRef = ref(database, `rooms/${roomId}/players/${currentUser.id}/ready`);
        await set(readyRef, isReady);
        
        if (isReady) {
            await addChatMessage(roomId, 'system', 
                `${currentUser.name} готов`);
        }
    } catch (error) {
        console.error('❌ Ошибка обновления готовности:', error);
    }
}

/**
 * Спрятаться/выйти
 */
export async function updatePlayerHiding(roomId, isHiding, spotId = null) {
    try {
        const updates = {
            isHiding: isHiding,
            hidingSpotId: spotId
        };
        
        await update(ref(database, `rooms/${roomId}/players/${currentUser.id}`), updates);
        
        if (isHiding) {
            await addChatMessage(roomId, 'system', 
                `${currentUser.name} спрятался`);
        } else {
            await addChatMessage(roomId, 'system', 
                `${currentUser.name} вышел из укрытия`);
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления укрытия:', error);
    }
}

/**
 * Обновить настройки комнаты
 */
export async function updateRoomSettings(roomId, settings) {
    try {
        const settingsRef = ref(database, `rooms/${roomId}/settings`);
        await update(settingsRef, settings);
        
        await addChatMessage(roomId, 'system', 'Настройки обновлены');
        
    } catch (error) {
        console.error('❌ Ошибка обновления настроек:', error);
        throw error;
    }
}

// ==============================================
// ПОДПИСКИ
// ==============================================

/**
 * Подписаться на комнату
 */
export function subscribeToRoom(roomId, callback) {
    if (!roomId) return () => {};
    
    const roomRef = ref(database, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        callback(roomData);
        
        if (!roomData && currentRoom === roomId) {
            currentRoom = null;
        }
    });
    
    return unsubscribe;
}

/**
 * Подписаться на игроков
 */
export function subscribeToPlayers(roomId, callback) {
    if (!roomId) return () => {};
    
    const playersRef = ref(database, `rooms/${roomId}/players`);
    
    const unsubscribe = onValue(playersRef, (snapshot) => {
        const players = snapshot.val() || {};
        callback(players);
    });
    
    return unsubscribe;
}

/**
 * Подписаться на список комнат
 */
export function subscribeToRooms(callback) {
    const roomsRef = ref(database, 'rooms');
    
    const unsubscribe = onValue(roomsRef, (snapshot) => {
        const roomsData = snapshot.val() || {};
        const rooms = Object.entries(roomsData)
            .map(([id, data]) => ({ id, ...data }))
            .filter(room => room.status === 'waiting');
        
        callback(rooms);
        
        // Обновляем счетчик онлайн
        updateOnlineCounters(rooms);
    });
    
    return unsubscribe;
}

/**
 * Подписаться на чат
 */
export function subscribeToChat(roomId, callback) {
    if (!roomId) return () => {};
    
    const chatRef = ref(database, `rooms/${roomId}/chatMessages`);
    
    const unsubscribe = onValue(chatRef, (snapshot) => {
        const messages = snapshot.val() || {};
        const messageList = Object.values(messages)
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        callback(messageList);
    });
    
    return unsubscribe;
}

/**
 * Отправить сообщение
 */
export async function sendChatMessage(roomId, message) {
    if (!roomId || !message?.trim() || !currentUser.id) return;
    
    try {
        const chatRef = ref(database, `rooms/${roomId}/chatMessages`);
        const newMessageRef = push(chatRef);
        
        const messageData = {
            id: newMessageRef.key,
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderColor: currentUser.color,
            message: message.trim(),
            timestamp: serverTimestamp(),
            type: 'player'
        };
        
        await set(newMessageRef, messageData);
        
        // Очистка старых сообщений
        await cleanupChatMessages(roomId, 50);
        
    } catch (error) {
        console.error('❌ Ошибка отправки сообщения:', error);
    }
}

// ==============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================================

/**
 * Генерация кода комнаты
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Выбор гренни
 */
function selectGrannies(players, count) {
    const playerIds = Object.keys(players);
    
    if (playerIds.length <= count) {
        return playerIds;
    }
    
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Настройка отключения
 */
async function setupDisconnectHandler(roomId) {
    if (!currentUser.id || !roomId) return;
    
    const playerRef = ref(database, `rooms/${roomId}/players/${currentUser.id}`);
    
    try {
        await onDisconnect(playerRef).remove();
    } catch (error) {
        console.error('❌ Ошибка настройки отключения:', error);
    }
}

/**
 * Добавить системное сообщение
 */
async function addChatMessage(roomId, type, message) {
    try {
        const chatRef = ref(database, `rooms/${roomId}/chatMessages`);
        const newMessageRef = push(chatRef);
        
        const messageData = {
            id: newMessageRef.key,
            senderId: 'system',
            senderName: 'Система',
            senderColor: '#FFD700',
            message: message,
            timestamp: serverTimestamp(),
            type: type
        };
        
        await set(newMessageRef, messageData);
        
        await cleanupChatMessages(roomId, 50);
        
    } catch (error) {
        console.error('❌ Ошибка системного сообщения:', error);
    }
}

/**
 * Очистка старых сообщений
 */
async function cleanupChatMessages(roomId, maxMessages = 50) {
    try {
        const chatRef = ref(database, `rooms/${roomId}/chatMessages`);
        const snapshot = await get(chatRef);
        
        if (!snapshot.exists()) return;
        
        const messages = snapshot.val();
        const messageIds = Object.keys(messages);
        
        if (messageIds.length > maxMessages) {
            const sorted = messageIds.sort((a, b) => 
                (messages[a].timestamp || 0) - (messages[b].timestamp || 0)
            );
            
            const toDelete = sorted.slice(0, messageIds.length - maxMessages);
            
            const deletePromises = toDelete.map(id => 
                remove(ref(database, `rooms/${roomId}/chatMessages/${id}`))
            );
            
            await Promise.all(deletePromises);
        }
    } catch (error) {
        console.error('❌ Ошибка очистки чата:', error);
    }
}

/**
 * Обновление статистики онлайн
 */
function updateOnlineCounters(rooms) {
    try {
        // Считаем общее количество игроков онлайн
        let totalPlayers = 0;
        rooms.forEach(room => {
            totalPlayers += Object.keys(room.players || {}).length;
        });
        
        // Обновляем UI
        const onlineCount = document.getElementById('online-count');
        const roomsCount = document.getElementById('rooms-count');
        
        if (onlineCount) onlineCount.textContent = totalPlayers;
        if (roomsCount) roomsCount.textContent = rooms.length;
        
    } catch (error) {
        console.warn('Не удалось обновить счетчики:', error);
    }
}

/**
 * Обновление глобальной статистики
 */
async function updateOnlineStats(action) {
    try {
        const statsRef = ref(database, 'globalStats');
        const snapshot = await get(statsRef);
        
        const currentStats = snapshot.exists() ? snapshot.val() : {
            totalRoomsCreated: 0,
            totalPlayersJoined: 0,
            totalGamesPlayed: 0,
            updatedAt: Date.now()
        };
        
        const updates = {
            updatedAt: Date.now()
        };
        
        switch(action) {
            case 'room_created':
                updates.totalRoomsCreated = (currentStats.totalRoomsCreated || 0) + 1;
                break;
            case 'player_joined':
                updates.totalPlayersJoined = (currentStats.totalPlayersJoined || 0) + 1;
                break;
            case 'player_left':
                updates.totalPlayersJoined = Math.max(0, (currentStats.totalPlayersJoined || 0) - 1);
                break;
        }
        
        await update(statsRef, updates);
        
    } catch (error) {
        console.warn('Ошибка обновления статистики:', error);
    }
}

// ==============================================
// ЭКСПОРТ
// ==============================================

export {
    database,
    currentUser,
    currentRoom
};

export const utils = {
    generateRoomCode,
    getAvatarLetter,
    saveUserToStorage,
    loadUserFromStorage
};
