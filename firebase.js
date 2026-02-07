// ==============================================
// firebase.js - РАСШИРЕННАЯ ВЕРСИЯ
// ==============================================

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
    serverTimestamp,
    query,
    orderByChild,
    equalTo,
    limitToLast
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDHKz6YuGSYzyO-Sj6IS93C9mV0yX0Yfbg",
    authDomain: "grannymultiplayer.firebaseapp.com",
    projectId: "grannymultiplayer",
    storageBucket: "grannymultiplayer.firebasestorage.app",
    messagingSenderId: "678766098712",
    appId: "1:678766098712:web:5dd0ead1e54da25109866d",
    databaseURL: "https://grannymultiplayer-default-rtdb.firebaseio.com/"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Текущий пользователь и комната
let currentUser = null;
let currentRoom = null;
let userStats = {};

// ==============================================
// АУТЕНТИФИКАЦИЯ
// ==============================================

/**
 * Вход через Google
 */
export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Сохраняем базовую информацию о пользователе
        await saveUserProfile(user);
        
        // Загружаем статистику
        await loadUserStats(user.uid);
        
        return user;
    } catch (error) {
        console.error("Ошибка входа через Google:", error);
        throw error;
    }
}

/**
 * Анонимный вход
 */
export async function loginAnonymously() {
    try {
        // В реальном приложении используйте signInAnonymously
        const fakeUser = {
            uid: 'anonymous_' + Date.now(),
            displayName: 'Анонимный игрок',
            photoURL: '',
            isAnonymous: true
        };
        
        await saveUserProfile(fakeUser);
        await loadUserStats(fakeUser.uid);
        
        return fakeUser;
    } catch (error) {
        console.error("Ошибка анонимного входа:", error);
        throw error;
    }
}

/**
 * Выход из системы
 */
export async function logout() {
    try {
        // Покидаем комнату если находимся в ней
        if (currentRoom) {
            await leaveRoom();
        }
        
        // Сбрасываем данные
        currentUser = null;
        currentRoom = null;
        userStats = {};
        
        await signOut(auth);
    } catch (error) {
        console.error("Ошибка выхода:", error);
        throw error;
    }
}

/**
 * Сохранение профиля пользователя
 */
async function saveUserProfile(user) {
    try {
        const userRef = ref(database, `users/${user.uid}`);
        const userData = {
            uid: user.uid,
            displayName: user.displayName || 'Игрок',
            photoURL: user.photoURL || '',
            email: user.email || '',
            lastLogin: serverTimestamp(),
            createdAt: serverTimestamp()
        };
        
        // Обновляем данные, но не перезаписываем createdAt
        await update(userRef, userData);
        
        // Создаем статистику если её нет
        const statsRef = ref(database, `userStats/${user.uid}`);
        const statsSnapshot = await get(statsRef);
        
        if (!statsSnapshot.exists()) {
            await set(statsRef, {
                gamesPlayed: 0,
                gamesWon: 0,
                gamesAsGranny: 0,
                gamesAsRunner: 0,
                totalPlayTime: 0,
                playersCaught: 0,
                timesCaught: 0,
                itemsCollected: 0,
                hideCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }
        
    } catch (error) {
        console.error("Ошибка сохранения профиля:", error);
    }
}

/**
 * Загрузка статистики пользователя
 */
async function loadUserStats(userId) {
    try {
        const statsRef = ref(database, `userStats/${userId}`);
        const snapshot = await get(statsRef);
        
        if (snapshot.exists()) {
            userStats = snapshot.val();
        } else {
            userStats = {
                gamesPlayed: 0,
                gamesWon: 0,
                gamesAsGranny: 0,
                gamesAsRunner: 0,
                totalPlayTime: 0
            };
        }
    } catch (error) {
        console.error("Ошибка загрузки статистики:", error);
        userStats = {};
    }
}

/**
 * Обновление статистики пользователя
 */
export async function updateUserStats(statsUpdate) {
    if (!currentUser) return;
    
    try {
        const statsRef = ref(database, `userStats/${currentUser.uid}`);
        
        // Обновляем статистику
        const updates = {
            ...statsUpdate,
            updatedAt: serverTimestamp()
        };
        
        await update(statsRef, updates);
        
        // Обновляем локальную копию
        Object.assign(userStats, statsUpdate);
        
    } catch (error) {
        console.error("Ошибка обновления статистики:", error);
    }
}

/**
 * Получение статистики пользователя
 */
export function getPlayerStats() {
    return { ...userStats };
}

// ==============================================
// СИСТЕМА КОМНАТ
// ==============================================

/**
 * Создание новой комнаты
 */
export async function createRoom() {
    if (!currentUser) throw new Error("Пользователь не авторизован");
    
    try {
        // Генерируем уникальный код комнаты
        const roomId = generateRoomCode();
        
        const roomRef = ref(database, `rooms/${roomId}`);
        
        const roomData = {
            id: roomId,
            host: currentUser.uid,
            hostName: currentUser.displayName,
            settings: {
                roundTime: 120,
                grannyCount: 1,
                map: 'house',
                voiceChat: true,
                maxPlayers: 8
            },
            players: {
                [currentUser.uid]: {
                    uid: currentUser.uid,
                    name: currentUser.displayName,
                    avatar: currentUser.photoURL || '',
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
            currentGrannies: [],
            chatMessages: [],
            gameLog: []
        };
        
        await set(roomRef, roomData);
        
        // Настраиваем обработчик отключения
        await setupDisconnectHandler(roomId);
        
        currentRoom = roomId;
        
        // Логируем создание комнаты
        await addGameLog(roomId, 'room_created', {
            playerId: currentUser.uid,
            playerName: currentUser.displayName
        });
        
        return roomId;
        
    } catch (error) {
        console.error("Ошибка создания комнаты:", error);
        throw error;
    }
}

/**
 * Присоединение к комнате
 */
export async function joinRoom(roomId) {
    if (!currentUser) throw new Error("Пользователь не авторизован");
    if (!roomId) throw new Error("Не указан код комнаты");
    
    try {
        // Проверяем существует ли комната
        const roomRef = ref(database, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) {
            throw new Error("Комната не найдена");
        }
        
        const roomData = snapshot.val();
        
        // Проверяем не полна ли комната
        const playerCount = Object.keys(roomData.players || {}).length;
        if (playerCount >= (roomData.settings?.maxPlayers || 8)) {
            throw new Error("Комната заполнена");
        }
        
        // Проверяем статус комнаты
        if (roomData.status !== 'waiting') {
            throw new Error("Игра уже началась");
        }
        
        // Добавляем игрока в комнату
        const playerData = {
            uid: currentUser.uid,
            name: currentUser.displayName,
            avatar: currentUser.photoURL || '',
            isGranny: false,
            ready: false,
            position: { x: 300, y: 300 },
            isHiding: false,
            hidingSpotId: null,
            caught: false,
            joinedAt: serverTimestamp()
        };
        
        await set(ref(database, `rooms/${roomId}/players/${currentUser.uid}`), playerData);
        
        // Настраиваем обработчик отключения
        await setupDisconnectHandler(roomId);
        
        currentRoom = roomId;
        
        // Добавляем сообщение в чат
        await addChatMessage(roomId, 'system', `${currentUser.displayName} присоединился к комнате`);
        
        // Логируем присоединение
        await addGameLog(roomId, 'player_joined', {
            playerId: currentUser.uid,
            playerName: currentUser.displayName
        });
        
        return true;
        
    } catch (error) {
        console.error("Ошибка присоединения к комнате:", error);
        throw error;
    }
}

/**
 * Покинуть комнату
 */
export async function leaveRoom() {
    if (!currentUser || !currentRoom) return;
    
    try {
        const playerRef = ref(database, `rooms/${currentRoom}/players/${currentUser.uid}`);
        
        // Получаем данные комнаты
        const roomRef = ref(database, `rooms/${currentRoom}`);
        const snapshot = await get(roomRef);
        const roomData = snapshot.val();
        
        // Если это хост и есть другие игроки
        if (roomData.host === currentUser.uid) {
            const players = Object.keys(roomData.players || {});
            if (players.length > 1) {
                // Назначаем нового хоста
                const otherPlayers = players.filter(id => id !== currentUser.uid);
                const newHost = otherPlayers[0];
                const newHostData = roomData.players[newHost];
                
                await update(roomRef, {
                    host: newHost,
                    hostName: newHostData.name
                });
                
                await addChatMessage(currentRoom, 'system', 
                    `${newHostData.name} теперь хост комнаты`);
            } else {
                // Если хост один, удаляем комнату
                await remove(roomRef);
                await addGameLog(currentRoom, 'room_deleted', {
                    reason: 'host_left'
                });
            }
        }
        
        // Удаляем игрока из комнаты
        await remove(playerRef);
        
        // Добавляем сообщение в чат
        await addChatMessage(currentRoom, 'system', 
            `${currentUser.displayName} покинул комнату`);
        
        // Логируем выход
        await addGameLog(currentRoom, 'player_left', {
            playerId: currentUser.uid,
            playerName: currentUser.displayName
        });
        
        // Сбрасываем текущую комнату
        currentRoom = null;
        
    } catch (error) {
        console.error("Ошибка выхода из комнаты:", error);
        throw error;
    }
}

/**
 * Обновить настройки комнаты
 */
export async function updateRoomSettings(roomId, settings) {
    if (!currentUser || !roomId) throw new Error("Не авторизован или комната не выбрана");
    
    try {
        // Проверяем что пользователь - хост
        const roomRef = ref(database, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) {
            throw new Error("Комната не найдена");
        }
        
        const roomData = snapshot.val();
        
        if (roomData.host !== currentUser.uid) {
            throw new Error("Только хост может менять настройки");
        }
        
        if (roomData.status !== 'waiting') {
            throw new Error("Настройки нельзя менять во время игры");
        }
        
        await update(roomRef, {
            [`settings`]: settings
        });
        
        await addChatMessage(roomId, 'system', 
            'Настройки комнаты обновлены');
        
    } catch (error) {
        console.error("Ошибка обновления настроек:", error);
        throw error;
    }
}

/**
 * Начать игру
 */
export async function startGame(roomId) {
    if (!currentUser || !roomId) throw new Error("Не авторизован или комната не выбрана");
    
    try {
        // Проверяем что пользователь - хост
        const roomRef = ref(database, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) {
            throw new Error("Комната не найдена");
        }
        
        const roomData = snapshot.val();
        
        if (roomData.host !== currentUser.uid) {
            throw new Error("Только хост может начать игру");
        }
        
        if (roomData.status !== 'waiting') {
            throw new Error("Игра уже начата");
        }
        
        // Проверяем что все игроки готовы
        const players = roomData.players || {};
        const playerIds = Object.keys(players);
        const readyPlayers = playerIds.filter(id => players[id].ready);
        
        if (playerIds.length < 2) {
            throw new Error("Нужно минимум 2 игрока");
        }
        
        if (readyPlayers.length !== playerIds.length) {
            throw new Error("Не все игроки готовы");
        }
        
        // Выбираем гренни
        const grannyCount = roomData.settings?.grannyCount || 1;
        const grannies = selectGrannies(players, grannyCount);
        
        // Обновляем статус игроков
        const updates = {};
        
        // Сбрасываем состояние всех игроков
        playerIds.forEach(playerId => {
            updates[`players/${playerId}/isGranny`] = grannies.includes(playerId);
            updates[`players/${playerId}/ready`] = false;
            updates[`players/${playerId}/caught`] = false;
            updates[`players/${playerId}/isHiding`] = false;
            updates[`players/${playerId}/hidingSpotId`] = null;
            
            // Устанавливаем начальные позиции
            if (grannies.includes(playerId)) {
                updates[`players/${playerId}/position`] = { x: 100, y: 100 };
            } else {
                updates[`players/${playerId}/position`] = { 
                    x: 500 + Math.random() * 200, 
                    y: 300 + Math.random() * 200 
                };
            }
        });
        
        // Обновляем состояние комнаты
        updates['status'] = 'playing';
        updates['gameStartTime'] = serverTimestamp();
        updates['currentGrannies'] = grannies;
        
        await update(roomRef, updates);
        
        // Добавляем сообщение в чат
        const grannyNames = grannies.map(id => players[id].name).join(', ');
        await addChatMessage(roomId, 'system', 
            `Игра началась! Гренни: ${grannyNames}`);
        
        // Логируем начало игры
        await addGameLog(roomId, 'game_started', {
            grannies: grannies,
            playerCount: playerIds.length,
            settings: roomData.settings
        });
        
    } catch (error) {
        console.error("Ошибка начала игры:", error);
        throw error;
    }
}

/**
 * Завершить игру
 */
export async function endGame(roomId, reason, winners) {
    if (!roomId) return;
    
    try {
        const roomRef = ref(database, `rooms/${roomId}`);
        
        const updates = {
            status: 'ended',
            gameEndTime: serverTimestamp(),
            winners: winners || [],
            endReason: reason
        };
        
        await update(roomRef, updates);
        
        // Обновляем статистику игроков
        const snapshot = await get(ref(database, `rooms/${roomId}/players`));
        const players = snapshot.val() || {};
        
        const updatePromises = Object.entries(players).map(async ([playerId, player]) => {
            const statsUpdate = {
                gamesPlayed: (userStats.gamesPlayed || 0) + 1,
                totalPlayTime: (userStats.totalPlayTime || 0) + 
                    (Date.now() - (player.joinedAt || Date.now()))
            };
            
            if (player.isGranny) {
                statsUpdate.gamesAsGranny = (userStats.gamesAsGranny || 0) + 1;
            } else {
                statsUpdate.gamesAsRunner = (userStats.gamesAsRunner || 0) + 1;
            }
            
            if (winners?.includes(playerId)) {
                statsUpdate.gamesWon = (userStats.gamesWon || 0) + 1;
            }
            
            await updateUserStats(statsUpdate);
        });
        
        await Promise.all(updatePromises);
        
        // Логируем завершение игры
        await addGameLog(roomId, 'game_ended', {
            reason: reason,
            winners: winners,
            playerCount: Object.keys(players).length
        });
        
    } catch (error) {
        console.error("Ошибка завершения игры:", error);
    }
}

// ==============================================
// ИГРОВЫЕ ДЕЙСТВИЯ
// ==============================================

/**
 * Обновить позицию игрока
 */
export async function updatePlayerPosition(roomId, position) {
    if (!currentUser || !roomId) return;
    
    try {
        const positionRef = ref(database, `rooms/${roomId}/players/${currentUser.uid}/position`);
        await set(positionRef, {
            ...position,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error("Ошибка обновления позиции:", error);
    }
}

/**
 * Обновить готовность игрока
 */
export async function updatePlayerReady(roomId, playerId, isReady) {
    try {
        const readyRef = ref(database, `rooms/${roomId}/players/${playerId}/ready`);
        await set(readyRef, isReady);
        
        if (isReady) {
            await addChatMessage(roomId, 'system', 
                `${currentUser.displayName} готов к игре`);
        }
    } catch (error) {
        console.error("Ошибка обновления готовности:", error);
        throw error;
    }
}

/**
 * Обновить статус укрытия
 */
export async function updatePlayerHiding(roomId, playerId, isHiding, spotId = null) {
    try {
        const updates = {
            isHiding: isHiding,
            hidingSpotId: spotId
        };
        
        if (isHiding) {
            await updateUserStats({ hideCount: (userStats.hideCount || 0) + 1 });
            
            // Логируем укрытие
            await addGameLog(roomId, 'player_hidden', {
                playerId: playerId,
                spotId: spotId
            });
        }
        
        await update(ref(database, `rooms/${roomId}/players/${playerId}`), updates);
        
    } catch (error) {
        console.error("Ошибка обновления статуса укрытия:", error);
    }
}

/**
 * Игрок пойман
 */
export async function playerCaught(roomId, catcherId, targetId) {
    try {
        const updates = {
            [`players/${targetId}/caught`]: true,
            [`players/${targetId}/isHiding`]: false,
            [`players/${targetId}/hidingSpotId`]: null,
            caughtBy: catcherId,
            caughtAt: serverTimestamp()
        };
        
        await update(ref(database, `rooms/${roomId}`), updates);
        
        // Обновляем статистику
        if (catcherId === currentUser?.uid) {
            await updateUserStats({ 
                playersCaught: (userStats.playersCaught || 0) + 1 
            });
        }
        
        if (targetId === currentUser?.uid) {
            await updateUserStats({ 
                timesCaught: (userStats.timesCaught || 0) + 1 
            });
        }
        
        // Получаем имена игроков для сообщения
        const roomRef = ref(database, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        const roomData = snapshot.val();
        
        const catcherName = roomData.players[catcherId]?.name || 'Игрок';
        const targetName = roomData.players[targetId]?.name || 'Игрок';
        
        // Добавляем сообщение в чат
        await addChatMessage(roomId, 'system', 
            `${catcherName} поймал ${targetName}!`);
        
        // Логируем поимку
        await addGameLog(roomId, 'player_caught', {
            catcherId: catcherId,
            targetId: targetId,
            timestamp: Date.now()
        });
        
        // Проверяем окончание игры
        await checkGameEnd(roomId);
        
    } catch (error) {
        console.error("Ошибка обработки поимки:", error);
    }
}

/**
 * Подобрать предмет
 */
export async function collectItem(roomId, playerId, itemId) {
    try {
        // Логируем сбор предмета
        await addGameLog(roomId, 'item_collected', {
            playerId: playerId,
            itemId: itemId
        });
        
        // Обновляем статистику
        if (playerId === currentUser?.uid) {
            await updateUserStats({ 
                itemsCollected: (userStats.itemsCollected || 0) + 1 
            });
        }
        
    } catch (error) {
        console.error("Ошибка обработки сбора предмета:", error);
    }
}

// ==============================================
// ЧАТ И ЛОГИ
// ==============================================

/**
 * Отправить сообщение в чат
 */
export async function sendChatMessage(roomId, message, user) {
    if (!roomId || !message?.trim()) return;
    
    try {
        const chatRef = ref(database, `rooms/${roomId}/chatMessages`);
        const newMessageRef = push(chatRef);
        
        const messageData = {
            id: newMessageRef.key,
            senderId: user?.uid || currentUser?.uid,
            senderName: user?.displayName || currentUser?.displayName || 'Игрок',
            message: message.trim(),
            timestamp: serverTimestamp(),
            type: 'player'
        };
        
        await set(newMessageRef, messageData);
        
        // Ограничиваем количество сообщений
        await cleanupChatMessages(roomId, 50);
        
    } catch (error) {
        console.error("Ошибка отправки сообщения:", error);
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
            message: message,
            timestamp: serverTimestamp(),
            type: type
        };
        
        await set(newMessageRef, messageData);
        
        await cleanupChatMessages(roomId, 50);
        
    } catch (error) {
        console.error("Ошибка добавления системного сообщения:", error);
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
            // Удаляем самые старые сообщения
            const messagesToDelete = messageIds
                .sort((a, b) => messages[a].timestamp - messages[b].timestamp)
                .slice(0, messageIds.length - maxMessages);
            
            const deletePromises = messagesToDelete.map(id => 
                remove(ref(database, `rooms/${roomId}/chatMessages/${id}`))
            );
            
            await Promise.all(deletePromises);
        }
    } catch (error) {
        console.error("Ошибка очистки сообщений:", error);
    }
}

/**
 * Добавить запись в игровой лог
 */
async function addGameLog(roomId, event, data) {
    try {
        const logRef = ref(database, `rooms/${roomId}/gameLog`);
        const newLogRef = push(logRef);
        
        const logEntry = {
            id: newLogRef.key,
            event: event,
            data: data,
            timestamp: serverTimestamp()
        };
        
        await set(newLogRef, logEntry);
        
    } catch (error) {
        console.error("Ошибка добавления записи в лог:", error);
    }
}

// ==============================================
// ПОДПИСКИ И СЛУШАТЕЛИ
// ==============================================

/**
 * Подписаться на изменения комнаты
 */
export function subscribeToRoom(roomId, callback) {
    if (!roomId) return () => {};
    
    const roomRef = ref(database, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        callback(roomData);
        
        // Если комната удалена
        if (!roomData && currentRoom === roomId) {
            currentRoom = null;
        }
    });
    
    return unsubscribe;
}

/**
 * Подписаться на изменения игроков
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
    });
    
    return unsubscribe;
}

/**
 * Подписаться на изменения чата
 */
export function subscribeToChat(roomId, callback) {
    if (!roomId) return () => {};
    
    const chatRef = ref(database, `rooms/${roomId}/chatMessages`);
    const chatQuery = query(chatRef, limitToLast(50));
    
    const unsubscribe = onValue(chatQuery, (snapshot) => {
        const messages = snapshot.val() || {};
        const messageList = Object.values(messages).sort((a, b) => 
            (a.timestamp || 0) - (b.timestamp || 0)
        );
        
        callback(messageList);
    });
    
    return unsubscribe;
}

/**
 * Слушатель состояния авторизации
 */
export function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged((user) => {
        currentUser = user;
        callback(user);
    });
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
    
    // Выбираем случайных игроков
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Настройка обработчика отключения
 */
async function setupDisconnectHandler(roomId) {
    if (!currentUser || !roomId) return;
    
    const playerRef = ref(database, `rooms/${roomId}/players/${currentUser.uid}`);
    
    try {
        await onDisconnect(playerRef).remove();
    } catch (error) {
        console.error("Ошибка настройки обработчика отключения:", error);
    }
}

/**
 * Проверка окончания игры
 */
async function checkGameEnd(roomId) {
    try {
        const roomRef = ref(database, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        const roomData = snapshot.val();
        
        if (roomData.status !== 'playing') return;
        
        const players = roomData.players || {};
        const playerIds = Object.keys(players);
        
        // Проверяем всех ли бегунов поймали
        const runners = playerIds.filter(id => !players[id].isGranny);
        const caughtRunners = runners.filter(id => players[id].caught);
        
        if (caughtRunners.length === runners.length && runners.length > 0) {
            // Гренни победили
            await endGame(roomId, 'all_runners_caught', roomData.currentGrannies);
            return;
        }
        
        // Проверяем время (должно проверяться на клиенте)
        // Здесь просто заглушка
        
    } catch (error) {
        console.error("Ошибка проверки окончания игры:", error);
    }
}

/**
 * Получить комнату по ID
 */
export async function getRoom(roomId) {
    try {
        const roomRef = ref(database, `rooms/${roomId}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) {
            return null;
        }
        
        return { id: roomId, ...snapshot.val() };
    } catch (error) {
        console.error("Ошибка получения комнаты:", error);
        return null;
    }
}

// ==============================================
// ЭКСПОРТ
// ==============================================

export {
    auth,
    database,
    currentUser,
    currentRoom
};

// Утилита для тестирования
export const utils = {
    generateRoomCode,
    getPlayerCount: async (roomId) => {
        const snapshot = await get(ref(database, `rooms/${roomId}/players`));
        const players = snapshot.val() || {};
        return Object.keys(players).length;
    }
};
