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

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Глобальные переменные
let currentUser = null;
let currentRoom = null;

// ==============================================
// ФУНКЦИИ АВТОРИЗАЦИИ
// ==============================================

/**
 * Вход через Google
 */
export async function loginWithGoogle() {
    try {
        console.log("🔄 Попытка входа через Google...");
        
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        // Настройки для всплывающего окна
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        console.log("✅ Пользователь вошел:", user.displayName);
        
        // Сохраняем/обновляем профиль
        await saveUserProfile(user);
        
        // Загружаем статистику
        await loadUserStats(user.uid);
        
        return user;
        
    } catch (error) {
        console.error("❌ Ошибка входа через Google:", error);
        
        // Детализированные ошибки
        let errorMessage = "Ошибка входа";
        
        switch(error.code) {
            case 'auth/popup-blocked':
                errorMessage = "Всплывающее окно заблокировано браузером. Разрешите всплывающие окна для этого сайта.";
                break;
            case 'auth/popup-closed-by-user':
                errorMessage = "Окно входа было закрыто. Пожалуйста, попробуйте снова.";
                break;
            case 'auth/cancelled-popup-request':
                errorMessage = "Запрос на вход был отменен.";
                break;
            case 'auth/unauthorized-domain':
                errorMessage = "Домен не авторизован. Проверьте настройки Firebase.";
                break;
            default:
                errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
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
            lastLogin: Date.now(),
            createdAt: serverTimestamp()
        };
        
        // Используем update вместо set, чтобы не перезаписывать createdAt
        await update(userRef, userData);
        
        console.log("✅ Профиль сохранен:", user.displayName);
        
    } catch (error) {
        console.error("❌ Ошибка сохранения профиля:", error);
    }
}

/**
 * Загрузка статистики пользователя
 */
async function loadUserStats(userId) {
    try {
        const statsRef = ref(database, `userStats/${userId}`);
        const snapshot = await get(statsRef);
        
        if (!snapshot.exists()) {
            // Создаем начальную статистику
            const initialStats = {
                gamesPlayed: 0,
                gamesWon: 0,
                gamesAsGranny: 0,
                gamesAsRunner: 0,
                totalPlayTime: 0,
                playersCaught: 0,
                timesCaught: 0,
                itemsCollected: 0,
                hideCount: 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            
            await set(statsRef, initialStats);
            console.log("✅ Создана новая статистика для пользователя");
        } else {
            console.log("✅ Статистика загружена");
        }
        
    } catch (error) {
        console.error("❌ Ошибка загрузки статистики:", error);
    }
}

/**
 * Выход из системы
 */
export async function logout() {
    try {
        console.log("🔄 Выход из системы...");
        
        if (currentRoom) {
            await leaveRoom();
        }
        
        await signOut(auth);
        currentUser = null;
        currentRoom = null;
        
        console.log("✅ Успешный выход");
        
    } catch (error) {
        console.error("❌ Ошибка выхода:", error);
        throw error;
    }
}

/**
 * Слушатель состояния авторизации
 */
export function onAuthStateChanged(callback) {
    return auth.onAuthStateChanged((user) => {
        currentUser = user;
        console.log("🔍 Состояние авторизации:", user ? "Вход выполнен" : "Выход");
        callback(user);
    });
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

// Экспорт утилит для отладки
export const debug = {
    getAuthState: () => auth.currentUser,
    getDatabase: () => database
};
