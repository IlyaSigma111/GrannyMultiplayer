import { 
    loginWithGoogle, 
    logout, 
    createRoom, 
    joinRoom, 
    leaveRoom, 
    startGame,
    updatePlayerPosition,
    subscribeToRoom,
    subscribeToPlayers,
    subscribeToRooms,
    currentUser,
    currentRoom,
    auth
} from './firebase.js';

// DOM элементы
const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const googleLoginBtn = document.getElementById('google-login');
const logoutBtn = document.getElementById('logout');
const createRoomBtn = document.getElementById('create-room');
const joinRoomBtn = document.getElementById('join-room');
const startGameBtn = document.getElementById('start-game');
const leaveRoomBtn = document.getElementById('leave-room');
const exitGameBtn = document.getElementById('exit-game');
const roomsContainer = document.getElementById('rooms-container');
const playersList = document.getElementById('players-list');
const roomInfo = document.getElementById('room-info');
const roomIdElement = document.getElementById('room-id');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const gameCanvas = document.getElementById('game-canvas');
const gameTimer = document.getElementById('game-timer');
const roleDisplay = document.getElementById('role-display');
const playersCount = document.getElementById('players-count');
const mobileControls = document.getElementById('mobile-controls');

// Игровые переменные
const ctx = gameCanvas.getContext('2d');
let gameState = {};
let localPlayer = {};
let players = {};
let furniture = [];
let hidingSpots = [];
let isGranny = false;
let gameTime = 120;
let gameInterval;
let keys = {};

// Размеры canvas
function resizeCanvas() {
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
}

// Генерация карты дома
function generateHouseMap() {
    // Комнаты дома
    const rooms = [
        { x: 50, y: 50, width: 400, height: 300, name: 'Гостиная' },
        { x: 500, y: 50, width: 400, height: 300, name: 'Кухня' },
        { x: 50, y: 400, width: 400, height: 300, name: 'Спальня' },
        { x: 500, y: 400, width: 400, height: 300, name: 'Подвал' }
    ];

    // Мебель и укрытия
    furniture = [
        { x: 100, y: 100, width: 80, height: 40, type: 'sofa' },
        { x: 300, y: 150, width: 60, height: 100, type: 'table' },
        { x: 600, y: 100, width: 100, height: 60, type: 'kitchen' },
        { x: 150, y: 450, width: 100, height: 60, type: 'bed' },
        { x: 650, y: 450, width: 80, height: 80, type: 'chest' }
    ];

    // Шкафчики для укрытия
    hidingSpots = [
        { x: 200, y: 200, width: 60, height: 100, type: 'cabinet', occupied: false },
        { x: 350, y: 100, width: 60, 
