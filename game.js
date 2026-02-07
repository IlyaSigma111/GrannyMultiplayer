// ==============================================
// game.js - ПОЛНАЯ ВЕРСИЯ (рабочий онлайн-мультиплеер)
// ==============================================

import {
    auth,
    loginWithGoogle,
    logout,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    updatePlayerPosition,
    updatePlayerReady,
    updatePlayerHiding,
    updateRoomSettings,
    subscribeToRoom,
    subscribeToPlayers,
    subscribeToRooms,
    sendChatMessage,
    onAuthStateChanged,
    currentUser,
    getPlayerStats,
    updatePlayerStats
} from './firebase.js';

// ==============================================
// КОНСТАНТЫ И ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ==============================================
const SCREENS = {
    LOGIN: 'login',
    MENU: 'menu',
    LOBBY: 'lobby',
    GAME: 'game',
    ENDGAME: 'endgame',
    SETTINGS: 'settings'
};

let CURRENT_SCREEN = SCREENS.LOGIN;
let CURRENT_ROOM = null;
let CURRENT_ROOM_DATA = null;
let LOCAL_PLAYER = null;
let PLAYERS = {};
let GAME_STATE = {
    status: 'waiting', // waiting, playing, ended
    timeLeft: 120,
    grannies: [],
    runners: [],
    hidingSpots: [],
    items: [],
    startTime: null
};

// Игровые настройки
const GAME_CONFIG = {
    GRID_SIZE: 50,
    PLAYER_SIZE: 15,
    GRANNY_SIZE: 20,
    CABINET_SIZE: { width: 60, height: 100 },
    PLAYER_SPEED: 3,
    GRANNY_SPEED: 2.5,
    HIDE_DISTANCE: 40,
    CATCH_DISTANCE: 25
};

// Управление
const KEYS = {};
const MOBILE_CONTROLS = {
    joystick: { x: 0, y: 0, active: false },
    buttons: {
        hide: false,
        interact: false,
        sprint: false
    }
};

// Canvas и графика
let CANVAS, CTX;
let ASSETS = {};
let CAMERA = { x: 0, y: 0, width: 0, height: 0 };

// Таймеры
let GAME_TIMER_INTERVAL = null;
let POSITION_UPDATE_INTERVAL = null;

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ==============================================
function initGame() {
    console.log('🚀 Инициализация игры...');
    
    // Настройка canvas
    setupCanvas();
    
    // Загрузка ресурсов
    loadAssets();
    
    // Настройка событий
    setupEventListeners();
    
    // Настройка Firebase слушателей
    setupFirebaseListeners();
    
    // Проверка авторизации
    checkAuthState();
    
    // Проверка устройства
    checkDeviceType();
    
    // Запуск игрового цикла
    requestAnimationFrame(gameLoop);
    
    console.log('✅ Игра инициализирована');
}

// ==============================================
// НАСТРОЙКА CANVAS
// ==============================================
function setupCanvas() {
    CANVAS = document.getElementById('game-canvas');
    CTX = CANVAS.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        CANVAS.width = window.innerWidth;
        CANVAS.height = window.innerHeight;
        document.getElementById('mobile-controls').classList.remove('hidden');
    } else {
        CANVAS.width = 1200;
        CANVAS.height = 800;
        document.getElementById('mobile-controls').classList.add('hidden');
    }
    
    CAMERA.width = CANVAS.width;
    CAMERA.height = CANVAS.height;
    
    // Обновление UI
    updateUIPositions();
}

// ==============================================
// ЗАГРУЗКА РЕСУРСОВ
// ==============================================
function loadAssets() {
    console.log('📦 Загрузка ресурсов...');
    
    // Создание простых спрайтов через canvas
    createPlaceholderSprites();
    
    // Загрузка реальных изображений (если есть)
    loadImages();
}

function createPlaceholderSprites() {
    // Игрок (зеленый круг)
    const playerCanvas = document.createElement('canvas');
    playerCanvas.width = 40;
    playerCanvas.height = 40;
    const playerCtx = playerCanvas.getContext('2d');
    
    // Тело
    playerCtx.fillStyle = '#4CAF50';
    playerCtx.beginPath();
    playerCtx.arc(20, 20, 15, 0, Math.PI * 2);
    playerCtx.fill();
    
    // Глаза
    playerCtx.fillStyle = 'white';
    playerCtx.beginPath();
    playerCtx.arc(15, 15, 3, 0, Math.PI * 2);
    playerCtx.arc(25, 15, 3, 0, Math.PI * 2);
    playerCtx.fill();
    
    // Улыбка
    playerCtx.strokeStyle = 'white';
    playerCtx.lineWidth = 2;
    playerCtx.beginPath();
    playerCtx.arc(20, 20, 8, 0.2 * Math.PI, 0.8 * Math.PI);
    playerCtx.stroke();
    
    ASSETS.player = playerCanvas;
    
    // Гренни (красный круг со злым лицом)
    const grannyCanvas = document.createElement('canvas');
    grannyCanvas.width = 50;
    grannyCanvas.height = 50;
    const grannyCtx = grannyCanvas.getContext('2d');
    
    // Тело
    grannyCtx.fillStyle = '#FF5252';
    grannyCtx.beginPath();
    grannyCtx.arc(25, 25, 20, 0, Math.PI * 2);
    grannyCtx.fill();
    
    // Глаза (злые)
    grannyCtx.fillStyle = 'white';
    grannyCtx.beginPath();
    grannyCtx.moveTo(18, 18);
    grannyCtx.lineTo(22, 22);
    grannyCtx.lineTo(18, 22);
    grannyCtx.fill();
    
    grannyCtx.beginPath();
    grannyCtx.moveTo(32, 18);
    grannyCtx.lineTo(28, 22);
    grannyCtx.lineTo(32, 22);
    grannyCtx.fill();
    
    // Рот (сердитый)
    grannyCtx.strokeStyle = 'white';
    grannyCtx.lineWidth = 3;
    grannyCtx.beginPath();
    grannyCtx.arc(25, 30, 6, 0, Math.PI);
    grannyCtx.stroke();
    
    // Волосы (седые)
    grannyCtx.strokeStyle = '#CCCCCC';
    grannyCtx.lineWidth = 2;
    for(let i = 0; i < 5; i++) {
        grannyCtx.beginPath();
        grannyCtx.moveTo(15 + i * 3, 10);
        grannyCtx.quadraticCurveTo(20 + i * 3, 5, 25 + i * 3, 10);
        grannyCtx.stroke();
    }
    
    ASSETS.granny = grannyCanvas;
    
    // Шкаф (коричневый прямоугольник)
    const cabinetCanvas = document.createElement('canvas');
    cabinetCanvas.width = 70;
    cabinetCanvas.height = 110;
    const cabinetCtx = cabinetCanvas.getContext('2d');
    
    // Корпус
    cabinetCtx.fillStyle = '#8B4513';
    cabinetCtx.fillRect(5, 5, 60, 100);
    
    // Дверцы
    cabinetCtx.fillStyle = '#A0522D';
    cabinetCtx.fillRect(10, 10, 25, 90);
    cabinetCtx.fillRect(40, 10, 25, 90);
    
    // Ручки
    cabinetCtx.fillStyle = '#FFD700';
    cabinetCtx.beginPath();
    cabinetCtx.arc(30, 50, 3, 0, Math.PI * 2);
    cabinetCtx.fill();
    
    cabinetCtx.beginPath();
    cabinetCtx.arc(60, 50, 3, 0, Math.PI * 2);
    cabinetCtx.fill();
    
    ASSETS.cabinet = cabinetCanvas;
    
    // Мебель
    const furnitureCanvas = document.createElement('canvas');
    furnitureCanvas.width = 100;
    furnitureCanvas.height = 100;
    const furnitureCtx = furnitureCanvas.getContext('2d');
    
    furnitureCtx.fillStyle = '#795548';
    furnitureCtx.fillRect(10, 10, 80, 80);
    furnitureCtx.fillStyle = '#5D4037';
    furnitureCtx.fillRect(20, 20, 60, 60);
    
    ASSETS.furniture = furnitureCanvas;
    
    // Пол
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 100;
    floorCanvas.height = 100;
    const floorCtx = floorCanvas.getContext('2d');
    
    // Паркетный узор
    floorCtx.fillStyle = '#D7CCC8';
    floorCtx.fillRect(0, 0, 100, 100);
    
    floorCtx.strokeStyle = '#A1887F';
    floorCtx.lineWidth = 1;
    for(let i = 0; i < 10; i++) {
        floorCtx.beginPath();
        floorCtx.moveTo(i * 10, 0);
        floorCtx.lineTo(i * 10, 100);
        floorCtx.stroke();
        
        floorCtx.beginPath();
        floorCtx.moveTo(0, i * 10);
        floorCtx.lineTo(100, i * 10);
        floorCtx.stroke();
    }
    
    ASSETS.floor = floorCanvas;
}

function loadImages() {
    const imageUrls = {
        player: 'assets/player.png',
        granny: 'assets/granny.png',
        cabinet: 'assets/cabinet.png',
        furniture: 'assets/furniture.png',
        floor: 'assets/floor.png'
    };
    
    let loaded = 0;
    const total = Object.keys(imageUrls).length;
    
    Object.entries(imageUrls).forEach(([key, url]) => {
        const img = new Image();
        img.onload = () => {
            ASSETS[key] = img;
            loaded++;
            console.log(`✅ Загружено: ${key}`);
            
            if (loaded === total) {
                console.log('🎉 Все ресурсы загружены!');
                showNotification('Ресурсы загружены', 'success');
            }
        };
        img.onerror = () => {
            console.warn(`⚠️ Не удалось загрузить: ${url}, использую placeholder`);
            loaded++;
        };
        img.src = url;
    });
}

// ==============================================
// УПРАВЛЕНИЕ И СОБЫТИЯ
// ==============================================
function setupEventListeners() {
    console.log('🎮 Настройка управления...');
    
    // Клавиатура
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Мышь/тач
    CANVAS.addEventListener('mousedown', handleMouseDown);
    CANVAS.addEventListener('mouseup', handleMouseUp);
    CANVAS.addEventListener('mousemove', handleMouseMove);
    CANVAS.addEventListener('touchstart', handleTouchStart);
    CANVAS.addEventListener('touchend', handleTouchEnd);
    CANVAS.addEventListener('touchmove', handleTouchMove);
    
    // UI события
    setupUIListeners();
    
    // События окна
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Ресайз
    window.addEventListener('resize', handleResize);
    
    console.log('✅ Управление настроено');
}

function setupUIListeners() {
    // Кнопки входа
    document.getElementById('google-login').addEventListener('click', handleGoogleLogin);
    document.getElementById('logout').addEventListener('click', handleLogout);
    
    // Главное меню
    document.getElementById('quick-play').addEventListener('click', handleQuickPlay);
    document.getElementById('create-game').addEventListener('click', handleCreateGame);
    document.getElementById('join-game').addEventListener('click', handleJoinGame);
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('login-btn').addEventListener('click', showLogin);
    
    // Лобби
    document.getElementById('start-game-btn').addEventListener('click', handleStartGame);
    document.getElementById('leave-lobby').addEventListener('click', handleLeaveLobby);
    document.getElementById('copy-code').addEventListener('click', handleCopyCode);
    document.getElementById('ready-checkbox').addEventListener('change', handleReadyToggle);
    
    // Настройки комнаты
    document.getElementById('round-time').addEventListener('input', handleRoundTimeChange);
    document.getElementById('granny-increase').addEventListener('click', () => handleGrannyCountChange(1));
    document.getElementById('granny-decrease').addEventListener('click', () => handleGrannyCountChange(-1));
    document.getElementById('map-select').addEventListener('change', handleMapChange);
    document.getElementById('voice-chat').addEventListener('change', handleVoiceChatToggle);
    
    // Игра
    document.getElementById('pause-game').addEventListener('click', handlePauseGame);
    document.getElementById('resume-game').addEventListener('click', handleResumeGame);
    document.getElementById('leave-game').addEventListener('click', handleLeaveGame);
    document.getElementById('open-chat').addEventListener('click', toggleGameChat);
    
    // Чат
    document.getElementById('send-chat').addEventListener('click', sendLobbyChat);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendLobbyChat();
    });
    
    document.getElementById('send-game-chat').addEventListener('click', sendGameChat);
    document.getElementById('game-chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendGameChat();
    });
    
    // Мобильные кнопки
    setupMobileControls();
}

function setupMobileControls() {
    const joystickArea = document.getElementById('move-joystick');
    const joystickKnob = joystickArea.querySelector('.joystick-knob');
    
    let joystickStartX = 0;
    let joystickStartY = 0;
    
    joystickArea.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = joystickArea.getBoundingClientRect();
        
        MOBILE_CONTROLS.joystick.active = true;
        joystickStartX = rect.left + rect.width / 2;
        joystickStartY = rect.top + rect.height / 2;
        
        updateMobileJoystick(touch);
    });
    
    document.addEventListener('touchmove', (e) => {
        if (!MOBILE_CONTROLS.joystick.active) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        updateMobileJoystick(touch);
    });
    
    document.addEventListener('touchend', () => {
        if (MOBILE_CONTROLS.joystick.active) {
            MOBILE_CONTROLS.joystick.active = false;
            MOBILE_CONTROLS.joystick.x = 0;
            MOBILE_CONTROLS.joystick.y = 0;
            joystickKnob.style.transform = 'translate(0, 0)';
        }
    });
    
    // Кнопки действий
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const action = e.currentTarget.dataset.action;
            MOBILE_CONTROLS.buttons[action] = true;
            
            // Визуальная обратная связь
            e.currentTarget.classList.add('active');
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const action = e.currentTarget.dataset.action;
            MOBILE_CONTROLS.buttons[action] = false;
            e.currentTarget.classList.remove('active');
        });
    });
}

function updateMobileJoystick(touch) {
    const joystickKnob = document.querySelector('#move-joystick .joystick-knob');
    const rect = document.getElementById('move-joystick').getBoundingClientRect();
    
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 50;
    
    if (distance > maxDistance) {
        MOBILE_CONTROLS.joystick.x = (deltaX / distance) * maxDistance;
        MOBILE_CONTROLS.joystick.y = (deltaY / distance) * maxDistance;
    } else {
        MOBILE_CONTROLS.joystick.x = deltaX;
        MOBILE_CONTROLS.joystick.y = deltaY;
    }
    
    // Обновление визуального джойстика
    joystickKnob.style.transform = `translate(${MOBILE_CONTROLS.joystick.x}px, ${MOBILE_CONTROLS.joystick.y}px)`;
}

// ==============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ==============================================
function handleKeyDown(e) {
    KEYS[e.code] = true;
    
    // Пауза на Escape
    if (e.code === 'Escape' && CURRENT_SCREEN === SCREENS.GAME) {
        togglePause();
    }
    
    // Чат на Enter
    if (e.code === 'Enter' && CURRENT_SCREEN === SCREENS.GAME) {
        const chatInput = document.getElementById('game-chat-input');
        if (document.activeElement !== chatInput) {
            e.preventDefault();
            toggleGameChat();
        }
    }
    
    // Спрятаться на E
    if (e.code === 'KeyE' && CURRENT_SCREEN === SCREENS.GAME && LOCAL_PLAYER) {
        handleHideAction();
    }
    
    // Бежать на Shift
    if (e.code === 'ShiftLeft' && CURRENT_SCREEN === SCREENS.GAME && LOCAL_PLAYER) {
        LOCAL_PLAYER.isSprinting = true;
    }
}

function handleKeyUp(e) {
    KEYS[e.code] = false;
    
    if (e.code === 'ShiftLeft' && LOCAL_PLAYER) {
        LOCAL_PLAYER.isSprinting = false;
    }
}

function handleMouseDown(e) {
    // Обработка кликов по игровым объектам
    const rect = CANVAS.getBoundingClientRect();
    const x = e.clientX - rect.left + CAMERA.x;
    const y = e.clientY - rect.top + CAMERA.y;
    
    if (CURRENT_SCREEN === SCREENS.GAME) {
        // Можно добавить взаимодействие с предметами
    }
}

function handleMouseUp(e) {
    // ...
}

function handleMouseMove(e) {
    // Обновление позиции мыши для UI
}

function handleTouchStart(e) {
    // Для тач-устройств
}

function handleTouchEnd(e) {
    // ...
}

function handleTouchMove(e) {
    // ...
}

function handleWindowBlur() {
    if (CURRENT_SCREEN === SCREENS.GAME && GAME_STATE.status === 'playing') {
        togglePause();
    }
}

function handleWindowFocus() {
    // ...
}

function handleBeforeUnload(e) {
    if (CURRENT_SCREEN === SCREENS.GAME || CURRENT_SCREEN === SCREENS.LOBBY) {
        e.preventDefault();
        e.returnValue = 'Вы уверены, что хотите покинуть игру?';
        return e.returnValue;
    }
}

function handleResize() {
    resizeCanvas();
}

// ==============================================
// UI ОБРАБОТЧИКИ
// ==============================================
async function handleGoogleLogin() {
    try {
        showNotification('Вход через Google...', 'info');
        const user = await loginWithGoogle();
        showNotification(`Добро пожаловать, ${user.displayName}!`, 'success');
        showMainMenu();
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification('Ошибка входа: ' + error.message, 'error');
    }
}

function handleLogout() {
    logout().then(() => {
        showLogin();
        showNotification('Вы вышли из системы', 'info');
    });
}

function handleQuickPlay() {
    showNotification('Поиск быстрой игры...', 'info');
    
    // Простая реализация - ищем первую доступную комнату
    subscribeToRooms((rooms) => {
        if (rooms.length > 0) {
            const room = rooms[0];
            joinRoom(room.id).then(() => {
                CURRENT_ROOM = room.id;
                showLobby(room);
            });
        } else {
            // Если комнат нет - создаем новую
            handleCreateGame();
        }
    });
}

async function handleCreateGame() {
    try {
        showNotification('Создание комнаты...', 'info');
        const roomId = await createRoom();
        CURRENT_ROOM = roomId;
        
        // Загружаем данные комнаты
        subscribeToRoom(roomId, (roomData) => {
            CURRENT_ROOM_DATA = roomData;
            showLobby(roomData);
        });
        
        showNotification('Комната создана!', 'success');
    } catch (error) {
        console.error('Ошибка создания комнаты:', error);
        showNotification('Ошибка создания комнаты', 'error');
    }
}

function handleJoinGame() {
    const roomCode = prompt('Введите код комнаты (4 символа):').toUpperCase();
    
    if (roomCode && roomCode.length === 4) {
        joinRoom(roomCode).then(success => {
            if (success) {
                CURRENT_ROOM = roomCode;
                showNotification('Присоединение к комнате...', 'info');
                
                subscribeToRoom(roomCode, (roomData) => {
                    if (roomData) {
                        CURRENT_ROOM_DATA = roomData;
                        showLobby(roomData);
                        showNotification('Вы присоединились к комнате!', 'success');
                    } else {
                        showNotification('Комната не найдена', 'error');
                        showMainMenu();
                    }
                });
            }
        });
    }
}

async function handleStartGame() {
    if (!CURRENT_ROOM) return;
    
    try {
        await startGame(CURRENT_ROOM);
        showNotification('Игра начинается!', 'success');
    } catch (error) {
        console.error('Ошибка начала игры:', error);
        showNotification('Ошибка начала игры', 'error');
    }
}

function handleLeaveLobby() {
    if (CURRENT_ROOM) {
        leaveRoom();
        CURRENT_ROOM = null;
        CURRENT_ROOM_DATA = null;
    }
    
    showMainMenu();
    showNotification('Вы покинули лобби', 'info');
}

function handleCopyCode() {
    if (CURRENT_ROOM_DATA) {
        navigator.clipboard.writeText(CURRENT_ROOM_DATA.id)
            .then(() => showNotification('Код скопирован!', 'success'))
            .catch(() => showNotification('Ошибка копирования', 'error'));
    }
}

function handleReadyToggle(e) {
    if (!CURRENT_ROOM || !currentUser) return;
    
    updatePlayerReady(CURRENT_ROOM, currentUser.uid, e.target.checked)
        .catch(error => console.error('Ошибка обновления готовности:', error));
}

function handleRoundTimeChange(e) {
    if (!CURRENT_ROOM || !CURRENT_ROOM_DATA) return;
    
    const newTime = parseInt(e.target.value);
    document.getElementById('round-time-value').textContent = `${newTime} сек`;
    
    updateRoomSettings(CURRENT_ROOM, { roundTime: newTime })
        .catch(error => console.error('Ошибка обновления времени:', error));
}

function handleGrannyCountChange(delta) {
    if (!CURRENT_ROOM || !CURRENT_ROOM_DATA) return;
    
    const current = CURRENT_ROOM_DATA.settings?.grannyCount || 1;
    const newCount = Math.max(1, Math.min(3, current + delta));
    
    document.getElementById('granny-count').value = newCount;
    
    updateRoomSettings(CURRENT_ROOM, { grannyCount: newCount })
        .catch(error => console.error('Ошибка обновления количества гренни:', error));
}

function handleMapChange(e) {
    if (!CURRENT_ROOM || !CURRENT_ROOM_DATA) return;
    
    updateRoomSettings(CURRENT_ROOM, { map: e.target.value })
        .catch(error => console.error('Ошибка обновления карты:', error));
}

function handleVoiceChatToggle(e) {
    if (!CURRENT_ROOM || !CURRENT_ROOM_DATA) return;
    
    updateRoomSettings(CURRENT_ROOM, { voiceChat: e.target.checked })
        .catch(error => console.error('Ошибка обновления голосового чата:', error));
}

function handlePauseGame() {
    togglePause();
}

function handleResumeGame() {
    togglePause();
}

function handleLeaveGame() {
    if (CURRENT_ROOM) {
        leaveRoom();
        CURRENT_ROOM = null;
    }
    
    clearGame();
    showMainMenu();
    showNotification('Вы покинули игру', 'info');
}

function handleHideAction() {
    if (!LOCAL_PLAYER || LOCAL_PLAYER.isGranny) return;
    
    // Проверяем рядом ли укрытие
    const nearbySpot = GAME_STATE.hidingSpots.find(spot => {
        if (spot.occupied) return false;
        
        const distance = Math.sqrt(
            Math.pow(LOCAL_PLAYER.position.x - (spot.x + spot.width/2), 2) +
            Math.pow(LOCAL_PLAYER.position.y - (spot.y + spot.height/2), 2)
        );
        
        return distance < GAME_CONFIG.HIDE_DISTANCE;
    });
    
    if (nearbySpot) {
        const isHiding = !LOCAL_PLAYER.isHiding;
        LOCAL_PLAYER.isHiding = isHiding;
        nearbySpot.occupied = isHiding;
        
        if (isHiding) {
            // Перемещаем игрока в центр укрытия
            LOCAL_PLAYER.position.x = nearbySpot.x + nearbySpot.width/2;
            LOCAL_PLAYER.position.y = nearbySpot.y + nearbySpot.height/2;
            showNotification('Вы спрятались!', 'success');
        } else {
            showNotification('Вы вышли из укрытия', 'info');
        }
        
        // Синхронизируем с сервером
        updatePlayerHiding(CURRENT_ROOM, LOCAL_PLAYER.id, isHiding, nearbySpot.id)
            .catch(error => console.error('Ошибка обновления статуса укрытия:', error));
    }
}

// ==============================================
// FIREBASE СЛУШАТЕЛИ
// ==============================================
function setupFirebaseListeners() {
    // Изменение состояния авторизации
    onAuthStateChanged((user) => {
        if (user) {
            console.log('✅ Пользователь авторизован:', user.displayName);
            updateUserUI(user);
            
            if (CURRENT_SCREEN === SCREENS.LOGIN) {
                showMainMenu();
            }
        } else {
            console.log('❌ Пользователь не авторизован');
            showLogin();
        }
    });
}

// ==============================================
// ИГРОВАЯ ЛОГИКА
// ==============================================
function startGameLogic(roomData) {
    console.log('🎮 Начало игры!');
    
    GAME_STATE = {
        status: 'playing',
        timeLeft: roomData.settings?.roundTime || 120,
        grannies: [],
        runners: [],
        hidingSpots: generateHidingSpots(),
        items: generateItems(),
        startTime: Date.now()
    };
    
    // Создаем локального игрока
    createLocalPlayer(roomData);
    
    // Подписываемся на обновления других игроков
    subscribeToPlayers(CURRENT_ROOM, handlePlayersUpdate);
    
    // Запускаем таймер
    startGameTimer();
    
    // Запускаем обновление позиций
    startPositionUpdates();
    
    // Обновляем UI
    updateGameUI();
    
    showNotification('Игра началась!', 'success');
}

function createLocalPlayer(roomData) {
    const players = roomData.players || {};
    const playerData = players[currentUser.uid];
    
    if (!playerData) {
        console.error('Данные игрока не найдены');
        return;
    }
    
    LOCAL_PLAYER = {
        id: currentUser.uid,
        name: playerData.name,
        position: playerData.position || { x: 100, y: 100 },
        isGranny: playerData.isGranny || false,
        isHiding: false,
        isSprinting: false,
        isReady: playerData.ready || false,
        color: playerData.isGranny ? '#FF5252' : '#4CAF50',
        speed: playerData.isGranny ? GAME_CONFIG.GRANNY_SPEED : GAME_CONFIG.PLAYER_SPEED
    };
    
    // Обновляем отображение роли
    updateRoleDisplay();
}

function generateHidingSpots() {
    const spots = [];
    const mapWidth = 1000;
    const mapHeight = 800;
    
    // Генерируем 10-15 укрытий
    const spotCount = 10 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < spotCount; i++) {
        spots.push({
            id: `spot_${i}`,
            x: 100 + Math.random() * (mapWidth - 200),
            y: 100 + Math.random() * (mapHeight - 200),
            width: GAME_CONFIG.CABINET_SIZE.width,
            height: GAME_CONFIG.CABINET_SIZE.height,
            type: 'cabinet',
            occupied: false,
            occupiedBy: null
        });
    }
    
    return spots;
}

function generateItems() {
    const items = [];
    const itemTypes = [
        { name: 'ключ', color: '#FFD700', effect: 'open_doors' },
        { name: 'фонарик', color: '#FF9800', effect: 'light' },
        { name: 'аптечка', color: '#F44336', effect: 'heal' },
        { name: 'ловушка', color: '#9C27B0', effect: 'trap' }
    ];
    
    for (let i = 0; i < 8; i++) {
        const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        items.push({
            id: `item_${i}`,
            x: 150 + Math.random() * 700,
            y: 150 + Math.random() * 500,
            type: type.name,
            color: type.color,
            effect: type.effect,
            collected: false
        });
    }
    
    return items;
}

function handlePlayersUpdate(playersData) {
    if (!playersData) return;
    
    PLAYERS = playersData;
    
    // Обновляем список игроков в UI
    updatePlayersListUI();
    
    // Обновляем игровое состояние
    updateGameStateFromPlayers();
}

function updateGameStateFromPlayers() {
    GAME_STATE.grannies = [];
    GAME_STATE.runners = [];
    
    Object.values(PLAYERS).forEach(player => {
        if (player.isGranny) {
            GAME_STATE.grannies.push(player);
        } else {
            GAME_STATE.runners.push(player);
        }
        
        // Обновляем занятость укрытий
        if (player.isHiding && player.hidingSpotId) {
            const spot = GAME_STATE.hidingSpots.find(s => s.id === player.hidingSpotId);
            if (spot) {
                spot.occupied = true;
                spot.occupiedBy = player.id;
            }
        }
    });
    
    // Обновляем счетчики в UI
    updateGameCounters();
}

function updatePlayerMovement() {
    if (!LOCAL_PLAYER || LOCAL_PLAYER.isHiding) return;
    
    let moveX = 0;
    let moveY = 0;
    
    // Клавиатура
    if (KEYS['KeyW'] || KEYS['ArrowUp']) moveY -= 1;
    if (KEYS['KeyS'] || KEYS['ArrowDown']) moveY += 1;
    if (KEYS['KeyA'] || KEYS['ArrowLeft']) moveX -= 1;
    if (KEYS['KeyD'] || KEYS['ArrowRight']) moveX += 1;
    
    // Мобильный джойстик
    if (MOBILE_CONTROLS.joystick.active) {
        moveX += MOBILE_CONTROLS.joystick.x / 50;
        moveY += MOBILE_CONTROLS.joystick.y / 50;
    }
    
    // Нормализация вектора движения
    if (moveX !== 0 || moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= length;
        moveY /= length;
    }
    
    // Учет спринта
    const speed = LOCAL_PLAYER.isSprinting ? LOCAL_PLAYER.speed * 1.5 : LOCAL_PLAYER.speed;
    
    // Вычисление новой позиции
    const newX = LOCAL_PLAYER.position.x + moveX * speed;
    const newY = LOCAL_PLAYER.position.y + moveY * speed;
    
    // Проверка коллизий с границами карты
    const mapWidth = 1000;
    const mapHeight = 800;
    
    if (newX >= 0 && newX <= mapWidth && newY >= 0 && newY <= mapHeight) {
        LOCAL_PLAYER.position.x = newX;
        LOCAL_PLAYER.position.y = newY;
    }
    
    // Обновляем камеру
    updateCamera();
}

function updateCamera() {
    if (!LOCAL_PLAYER) return;
    
    // Камера следует за игроком
    CAMERA.x = LOCAL_PLAYER.position.x - CAMERA.width / 2;
    CAMERA.y = LOCAL_PLAYER.position.y - CAMERA.height / 2;
    
    // Ограничение камеры границами карты
    const mapWidth = 1000;
    const mapHeight = 800;
    
    CAMERA.x = Math.max(0, Math.min(mapWidth - CAMERA.width, CAMERA.x));
    CAMERA.y = Math.max(0, Math.min(mapHeight - CAMERA.height, CAMERA.y));
}

function checkCatch() {
    if (!LOCAL_PLAYER || !LOCAL_PLAYER.isGranny) return;
    
    Object.values(PLAYERS).forEach(player => {
        if (player.id === LOCAL_PLAYER.id || player.isGranny || player.isHiding) return;
        
        const distance = Math.sqrt(
            Math.pow(LOCAL_PLAYER.position.x - player.position.x, 2) +
            Math.pow(LOCAL_PLAYER.position.y - player.position.y, 2)
        );
        
        if (distance < GAME_CONFIG.CATCH_DISTANCE) {
            // Поймали игрока!
            showNotification(`Вы поймали ${player.name}!`, 'warning');
            // Здесь нужно отправить событие на сервер
        }
    });
}

function checkItemPickup() {
    if (!LOCAL_PLAYER || LOCAL_PLAYER.isHiding) return;
    
    GAME_STATE.items.forEach(item => {
        if (item.collected) return;
        
        const distance = Math.sqrt(
            Math.pow(LOCAL_PLAYER.position.x - item.x, 2) +
            Math.pow(LOCAL_PLAYER.position.y - item.y, 2)
        );
        
        if (distance < 20) {
            item.collected = true;
            showNotification(`Вы подобрали ${item.type}!`, 'success');
            // Здесь можно добавить эффект предмета
        }
    });
}

// ==============================================
// ТАЙМЕРЫ
// ==============================================
function startGameTimer() {
    clearInterval(GAME_TIMER_INTERVAL);
    
    GAME_TIMER_INTERVAL = setInterval(() => {
        GAME_STATE.timeLeft--;
        
        // Обновляем таймер в UI
        updateGameTimerUI();
        
        // Проверка конца игры
        if (GAME_STATE.timeLeft <= 0) {
            endGame('timeout');
        }
        
        // Проверка условий победы
        checkWinConditions();
        
    }, 1000);
}

function startPositionUpdates() {
    clearInterval(POSITION_UPDATE_INTERVAL);
    
    POSITION_UPDATE_INTERVAL = setInterval(() => {
        if (LOCAL_PLAYER && CURRENT_ROOM && !LOCAL_PLAYER.isHiding) {
            updatePlayerPosition(CURRENT_ROOM, LOCAL_PLAYER.position)
                .catch(error => console.error('Ошибка обновления позиции:', error));
        }
    }, 100); // Обновляем позицию каждые 100мс
}

function checkWinConditions() {
    // Простая логика победы
    const aliveRunners = Object.values(PLAYERS).filter(p => !p.isGranny && !p.caught).length;
    
    if (aliveRunners === 0) {
        endGame('granny_win');
    }
}

function endGame(reason) {
    clearInterval(GAME_TIMER_INTERVAL);
    clearInterval(POSITION_UPDATE_INTERVAL);
    
    GAME_STATE.status = 'ended';
    
    let message = '';
    switch(reason) {
        case 'timeout':
            message = 'Время вышло! Бегуны победили!';
            break;
        case 'granny_win':
            message = 'Гренни поймали всех!';
            break;
        default:
            message = 'Игра окончена!';
    }
    
    showNotification(message, 'info');
    
    // Показываем экран результатов
    setTimeout(() => {
        showEndGameScreen(reason);
    }, 2000);
}

// ==============================================
// РЕНДЕРИНГ
// ==============================================
function gameLoop() {
    // Очистка экрана
    CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);
    
    // Рендер в зависимости от экрана
    switch(CURRENT_SCREEN) {
        case SCREENS.LOGIN:
            renderLoginScreen();
            break;
        case SCREENS.MENU:
            renderMenuScreen();
            break;
        case SCREENS.LOBBY:
            renderLobbyScreen();
            break;
        case SCREENS.GAME:
            renderGameScreen();
            break;
        case SCREENS.ENDGAME:
            renderEndGameScreen();
            break;
        case SCREENS.SETTINGS:
            renderSettingsScreen();
            break;
    }
    
    // Обновление логики игры
    if (CURRENT_SCREEN === SCREENS.GAME && GAME_STATE.status === 'playing') {
        updateGameLogic();
    }
    
    requestAnimationFrame(gameLoop);
}

function renderGameScreen() {
    // Рендер карты
    renderMap();
    
    // Рендер предметов
    renderItems();
    
    // Рендер укрытий
    renderHidingSpots();
    
    // Рендер других игроков
    renderOtherPlayers();
    
    // Рендер локального игрока
    renderLocalPlayer();
    
    // Рендер UI поверх игры
    renderGameUI();
}

function renderMap() {
    // Фон (пол)
    const pattern = CTX.createPattern(ASSETS.floor, 'repeat');
    CTX.fillStyle = pattern;
    CTX.fillRect(-CAMERA.x, -CAMERA.y, 1000, 800);
    
    // Стены
    CTX.fillStyle = '#8D6E63';
    CTX.fillRect(50 - CAMERA.x, 50 - CAMERA.y, 900, 700);
    CTX.fillStyle = '#5D4037';
    CTX.fillRect(60 - CAMERA.x, 60 - CAMERA.y, 880, 680);
    
    // Мебель
    const furniturePositions = [
        { x: 200, y: 150 },
        { x: 600, y: 150 },
        { x: 200, y: 500 },
        { x: 600, y: 500 }
    ];
    
    furniturePositions.forEach(pos => {
        CTX.drawImage(
            ASSETS.furniture,
            pos.x - CAMERA.x,
            pos.y - CAMERA.y,
            100, 100
        );
    });
}

function renderItems() {
    GAME_STATE.items.forEach(item => {
        if (item.collected) return;
        
        CTX.fillStyle = item.color;
        CTX.beginPath();
        CTX.arc(
            item.x - CAMERA.x,
            item.y - CAMERA.y,
            8, 0, Math.PI * 2
        );
        CTX.fill();
        
        // Обводка
        CTX.strokeStyle = '#FFFFFF';
        CTX.lineWidth = 2;
        CTX.stroke();
        
        // Текст
        CTX.fillStyle = '#FFFFFF';
        CTX.font = '10px Arial';
        CTX.textAlign = 'center';
        CTX.fillText(
            item.type[0].toUpperCase(),
            item.x - CAMERA.x,
            item.y - CAMERA.y + 3
        );
    });
}

function renderHidingSpots() {
    GAME_STATE.hidingSpots.forEach(spot => {
        if (spot.occupied) {
            CTX.globalAlpha = 0.7;
        }
        
        CTX.drawImage(
            ASSETS.cabinet,
            spot.x - CAMERA.x,
            spot.y - CAMERA.y,
            spot.width,
            spot.height
        );
        
        CTX.globalAlpha = 1.0;
        
        // Индикатор занятости
        if (spot.occupied) {
            CTX.fillStyle = '#FF5252';
            CTX.font = '12px Arial';
            CTX.textAlign = 'center';
            CTX.fillText(
                'ЗАНЯТО',
                spot.x - CAMERA.x + spot.width/2,
                spot.y - CAMERA.y - 10
            );
        }
    });
}

function renderOtherPlayers() {
    Object.values(PLAYERS).forEach(player => {
        if (player.id === LOCAL_PLAYER?.id) return;
        
        const sprite = player.isGranny ? ASSETS.granny : ASSETS.player;
        const size = player.isGranny ? GAME_CONFIG.GRANNY_SIZE : GAME_CONFIG.PLAYER_SIZE;
        
        // Рендер игрока
        CTX.drawImage(
            sprite,
            player.position.x - size/2 - CAMERA.x,
            player.position.y - size/2 - CAMERA.y,
            size * 2,
            size * 2
        );
        
        // Имя игрока
        CTX.fillStyle = '#FFFFFF';
        CTX.font = '12px Arial';
        CTX.textAlign = 'center';
        CTX.fillText(
            player.name,
            player.position.x - CAMERA.x,
            player.position.y - size - CAMERA.y - 5
        );
        
        // Индикатор укрытия
        if (player.isHiding) {
            CTX.strokeStyle = '#2196F3';
            CTX.lineWidth = 2;
            CTX.beginPath();
            CTX.arc(
                player.position.x - CAMERA.x,
                player.position.y - CAMERA.y,
                size + 5,
                0, Math.PI * 2
            );
            CTX.stroke();
        }
        
        // Индикатор пойманности
        if (player.caught) {
            CTX.fillStyle = 'rgba(0, 0, 0, 0.5)';
            CTX.beginPath();
            CTX.arc(
                player.position.x - CAMERA.x,
                player.position.y - CAMERA.y,
                size,
                0, Math.PI * 2
            );
            CTX.fill();
            
            CTX.fillStyle = '#FFFFFF';
            CTX.fillText(
                'ПОЙМАН',
                player.position.x - CAMERA.x,
                player.position.y - CAMERA.y + 5
            );
        }
    });
}

function renderLocalPlayer() {
    if (!LOCAL_PLAYER) return;
    
    const sprite = LOCAL_PLAYER.isGranny ? ASSETS.granny : ASSETS.player;
    const size = LOCAL_PLAYER.isGranny ? GAME_CONFIG.GRANNY_SIZE : GAME_CONFIG.PLAYER_SIZE;
    
    // Рендер игрока
    CTX.drawImage(
        sprite,
        LOCAL_PLAYER.position.x - size/2 - CAMERA.x,
        LOCAL_PLAYER.position.y - size/2 - CAMERA.y,
        size * 2,
        size * 2
    );
    
    // Обводка для локального игрока
    CTX.strokeStyle = '#FFFFFF';
    CTX.lineWidth = 3;
    CTX.beginPath();
    CTX.arc(
        LOCAL_PLAYER.position.x - CAMERA.x,
        LOCAL_PLAYER.position.y - CAMERA.y,
        size + 2,
        0, Math.PI * 2
    );
    CTX.stroke();
    
    // Индикатор укрытия
    if (LOCAL_PLAYER.isHiding) {
        CTX.fillStyle = 'rgba(33, 150, 243, 0.3)';
        CTX.beginPath();
        CTX.arc(
            LOCAL_PLAYER.position.x - CAMERA.x,
            LOCAL_PLAYER.position.y - CAMERA.y,
            size + 10,
            0, Math.PI * 2
        );
        CTX.fill();
    }
    
    // Индикатор спринта
    if (LOCAL_PLAYER.isSprinting) {
        CTX.fillStyle = '#FF9800';
        CTX.font = '10px Arial';
        CTX.textAlign = 'center';
        CTX.fillText(
            'СПРИНТ',
            LOCAL_PLAYER.position.x - CAMERA.x,
            LOCAL_PLAYER.position.y + size + CAMERA.y + 15
        );
    }
}

function updateGameLogic() {
    updatePlayerMovement();
    checkCatch();
    checkItemPickup();
}

// ==============================================
// UI ФУНКЦИИ
// ==============================================
function showScreen(screenName) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Показываем нужный экран
    document.getElementById(`${screenName}-screen`).classList.remove('hidden');
    CURRENT_SCREEN = screenName;
    
    // Обновляем UI для экрана
    updateScreenUI(screenName);
}

function showLogin() {
    showScreen(SCREENS.LOGIN);
}

function showMainMenu() {
    showScreen(SCREENS.MENU);
    updateUserUI(currentUser);
}

function showLobby(roomData) {
    showScreen(SCREENS.LOBBY);
    updateLobbyUI(roomData);
}

function showGame() {
    showScreen(SCREENS.GAME);
}

function showEndGameScreen(reason) {
    showScreen(SCREENS.ENDGAME);
    updateEndGameUI(reason);
}

function showSettings() {
    showScreen(SCREENS.SETTINGS);
}

function updateUserUI(user) {
    if (!user) return;
    
    const profileAvatar = document.getElementById('profile-avatar');
    const profileName = document.getElementById('profile-name');
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    
    if (profileAvatar) profileAvatar.src = user.photoURL || '';
    if (profileName) profileName.textContent = user.displayName;
    if (userName) userName.textContent = user.displayName;
    if (userAvatar) userAvatar.src = user.photoURL || '';
}

function updateLobbyUI(roomData) {
    if (!roomData) return;
    
    // Код комнаты
    document.getElementById('room-name').textContent = `Комната #${roomData.id}`;
    document.getElementById('room-code').textContent = roomData.id;
    
    // Настройки
    const settings = roomData.settings || {};
    document.getElementById('round-time').value = settings.roundTime || 120;
    document.getElementById('round-time-value').textContent = `${settings.roundTime || 120} сек`;
    document.getElementById('granny-count').value = settings.grannyCount || 1;
    document.getElementById('map-select').value = settings.map || 'house';
    document.getElementById('voice-chat').checked = settings.voiceChat || false;
    
    // Список игроков
    updatePlayersListUI(roomData.players);
    
    // Кнопка начала игры (только для хоста)
    const startBtn = document.getElementById('start-game-btn');
    const isHost = roomData.host === currentUser.uid;
    startBtn.disabled = !isHost;
    
    if (isHost) {
        startBtn.classList.add('enabled');
    } else {
        startBtn.classList.remove('enabled');
    }
}

function updatePlayersListUI(players) {
    const container = document.getElementById('players-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!players) {
        container.innerHTML = '<p>Нет игроков</p>';
        return;
    }
    
    Object.values(players).forEach(player => {
        const playerEl = document.createElement('div');
        playerEl.className = 'player-card';
        playerEl.innerHTML = `
            <div class="player-avatar">
                <img src="${player.avatar || ''}" alt="${player.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%234CAF50%22/></svg>'">
                ${player.isGranny ? '<div class="host-badge"><i class="fas fa-ghost"></i></div>' : ''}
                ${player.ready ? '<div class="ready-badge"><i class="fas fa-check"></i></div>' : ''}
            </div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-status">
                    ${player.isGranny ? '<span class="role-badge granny">👵 Гренни</span>' : '<span class="role-badge runner">🏃 Бегун</span>'}
                </div>
            </div>
        `;
        container.appendChild(playerEl);
    });
    
    // Обновляем счетчик
    document.getElementById('players-count').textContent = Object.keys(players).length;
}

function updateGameUI() {
    updateRoleDisplay();
    updateGameTimerUI();
    updateGameCounters();
}

function updateRoleDisplay() {
    const roleDisplay = document.getElementById('role-display');
    if (!roleDisplay || !LOCAL_PLAYER) return;
    
    roleDisplay.innerHTML = LOCAL_PLAYER.isGranny ? 
        '<i class="fas fa-ghost"></i> Вы: 👵 Гренни' : 
        '<i class="fas fa-running"></i> Вы: 🏃 Бегун';
    
    roleDisplay.className = `role-display ${LOCAL_PLAYER.isGranny ? 'role-granny' : 'role-runner'}`;
}

function updateGameTimerUI() {
    const timerElement = document.getElementById('game-timer');
    if (!timerElement) return;
    
    const minutes = Math.floor(GAME_STATE.timeLeft / 60);
    const seconds = GAME_STATE.timeLeft % 60;
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Изменение цвета при малом времени
    if (GAME_STATE.timeLeft <= 30) {
        timerElement.style.color = '#FF5252';
        timerElement.style.animation = GAME_STATE.timeLeft <= 10 ? 'pulse 0.5s infinite' : 'none';
    } else {
        timerElement.style.color = '#FFD700';
        timerElement.style.animation = 'none';
    }
}

function updateGameCounters() {
    const runnersCount = document.getElementById('runners-count');
    const granniesCount = document.getElementById('grannies-count');
    const hiddenCount = document.getElementById('hidden-count');
    
    if (runnersCount) {
        const runners = Object.values(PLAYERS).filter(p => !p.isGranny && !p.caught).length;
        runnersCount.textContent = runners;
    }
    
    if (granniesCount) {
        const grannies = Object.values(PLAYERS).filter(p => p.isGranny).length;
        granniesCount.textContent = grannies;
    }
    
    if (hiddenCount) {
        const hidden = Object.values(PLAYERS).filter(p => p.isHiding).length;
        hiddenCount.textContent = hidden;
    }
}

function updateEndGameUI(reason) {
    const container = document.querySelector('.endgame-container');
    if (!container) return;
    
    let title = '';
    let message = '';
    
    switch(reason) {
        case 'timeout':
            title = '🏃 Бегуны победили!';
            message = 'Время вышло, вы пережили гренни!';
            break;
        case 'granny_win':
            title = '👵 Гренни победили!';
            message = 'Все бегуны были пойманы!';
            break;
        default:
            title = 'Игра окончена!';
            message = 'Спасибо за игру!';
    }
    
    const isWinner = (reason === 'timeout' && !LOCAL_PLAYER?.isGranny) || 
                    (reason === 'granny_win' && LOCAL_PLAYER?.isGranny);
    
    container.innerHTML = `
        <div class="endgame-content ${isWinner ? 'winner' : 'loser'}">
            <h1>${title}</h1>
            <p class="endgame-message">${message}</p>
            
            <div class="game-stats-summary">
                <h3>Статистика игры:</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Длительность:</span>
                        <span class="stat-value">${Math.floor((Date.now() - GAME_STATE.startTime) / 1000)} сек</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Бегунов осталось:</span>
                        <span class="stat-value">${Object.values(PLAYERS).filter(p => !p.isGranny && !p.caught).length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Поймано:</span>
                        <span class="stat-value">${Object.values(PLAYERS).filter(p => !p.isGranny && p.caught).length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Спрятано предметов:</span>
                        <span class="stat-value">${GAME_STATE.items.filter(i => i.collected).length}</span>
                    </div>
                </div>
            </div>
            
            <div class="endgame-buttons">
                <button id="play-again" class="btn primary">
                    <i class="fas fa-redo"></i>
                    Играть снова
                </button>
                <button id="back-to-lobby" class="btn">
                    <i class="fas fa-home"></i>
                    В лобби
                </button>
                <button id="back-to-menu" class="btn">
                    <i class="fas fa-sign-out-alt"></i>
                    В главное меню
                </button>
            </div>
        </div>
    `;
    
    // Добавляем обработчики кнопок
    document.getElementById('play-again').addEventListener('click', handlePlayAgain);
    document.getElementById('back-to-lobby').addEventListener('click', () => showLobby(CURRENT_ROOM_DATA));
    document.getElementById('back-to-menu').addEventListener('click', handleBackToMenu);
}

function handlePlayAgain() {
    if (CURRENT_ROOM) {
        // Перезапускаем игру
        startGameLogic(CURRENT_ROOM_DATA);
        showGame();
    }
}

function handleBackToMenu() {
    clearGame();
    showMainMenu();
}

function clearGame() {
    clearInterval(GAME_TIMER_INTERVAL);
    clearInterval(POSITION_UPDATE_INTERVAL);
    
    LOCAL_PLAYER = null;
    PLAYERS = {};
    GAME_STATE = {
        status: 'waiting',
        timeLeft: 120,
        grannies: [],
        runners: [],
        hidingSpots: [],
        items: [],
        startTime: null
    };
}

function togglePause() {
    if (GAME_STATE.status === 'playing') {
        GAME_STATE.status = 'paused';
        document.getElementById('pause-menu').classList.remove('hidden');
        showNotification('Игра на паузе', 'info');
    } else if (GAME_STATE.status === 'paused') {
        GAME_STATE.status = 'playing';
        document.getElementById('pause-menu').classList.add('hidden');
        showNotification('Игра продолжается', 'success');
    }
}

function toggleGameChat() {
    const chat = document.getElementById('game-chat');
    chat.classList.toggle('hidden');
    
    if (!chat.classList.contains('hidden')) {
        document.getElementById('game-chat-input').focus();
    }
}

function sendLobbyChat() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (message && CURRENT_ROOM) {
        sendChatMessage(CURRENT_ROOM, message, currentUser)
            .then(() => {
                input.value = '';
            })
            .catch(error => console.error('Ошибка отправки сообщения:', error));
    }
}

function sendGameChat() {
    const input = document.getElementById('game-chat-input');
    const message = input.value.trim();
    
    if (message && CURRENT_ROOM) {
        sendChatMessage(CURRENT_ROOM, message, currentUser)
            .then(() => {
                input.value = '';
            })
            .catch(error => console.error('Ошибка отправки сообщения:', error));
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    const container = document.getElementById('notifications');
    if (container) {
        container.appendChild(notification);
        
        // Автоматическое удаление
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function checkDeviceType() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile');
    } else {
        document.body.classList.add('desktop');
    }
}

function checkAuthState() {
    if (currentUser) {
        showMainMenu();
    } else {
        showLogin();
    }
}

// ==============================================
// ЗАПУСК ИГРЫ
// ==============================================
// Инициализация при полной загрузке страницы
window.addEventListener('DOMContentLoaded', initGame);

// Экспорт для отладки в консоли
window.game = {
    showScreen,
    showNotification,
    startGameLogic,
    updatePlayerMovement,
    checkCatch,
    endGame,
    getState: () => ({
        CURRENT_SCREEN,
        CURRENT_ROOM,
        LOCAL_PLAYER,
        PLAYERS,
        GAME_STATE,
        KEYS
    })
};

console.log('🎮 Granny Multiplayer загружен!');
