// ==============================================
// utils.js - ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================================

/**
 * Форматирование времени
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Форматирование даты
 */
export function formatDate(timestamp) {
    if (!timestamp) return '--:--';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Генерация случайного числа в диапазоне
 */
export function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Генерация случайного цвета
 */
export function randomColor() {
    const colors = [
        '#FF5252', '#FF9800', '#FFEB3B', '#4CAF50', '#2196F3',
        '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722'
    ];
    return colors[random(0, colors.length - 1)];
}

/**
 * Проверка коллизии круга и прямоугольника
 */
export function circleRectCollision(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    
    return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
}

/**
 * Проверка коллизии двух кругов
 */
export function circleCircleCollision(c1, c2) {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < (c1.radius + c2.radius);
}

/**
 * Расчет расстояния между двумя точками
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Интерполяция позиции для плавного движения
 */
export function interpolatePosition(oldPos, newPos, alpha) {
    return {
        x: oldPos.x + (newPos.x - oldPos.x) * alpha,
        y: oldPos.y + (newPos.y - oldPos.y) * alpha
    };
}

/**
 * Ограничение значения в диапазоне
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Нормализация вектора
 */
export function normalizeVector(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

/**
 * Преобразование радиан в градусы
 */
export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Преобразование градусов в радианы
 */
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Генерация уникального ID
 */
export function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Копирование текста в буфер обмена
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            return true;
        } catch (err) {
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

/**
 * Сохранение в локальное хранилище
 */
export function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения в хранилище:', error);
        return false;
    }
}

/**
 * Загрузка из локального хранилища
 */
export function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Ошибка загрузки из хранилища:', error);
        return defaultValue;
    }
}

/**
 * Удаление из локального хранилища
 */
export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Ошибка удаления из хранилища:', error);
        return false;
    }
}

/**
 * Проверка поддержки WebGL
 */
export function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
            (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
}

/**
 * Проверка мобильного устройства
 */
export function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Проверка тач-устройства
 */
export function isTouchDevice() {
    return 'ontouchstart' in window || 
           navigator.maxTouchPoints > 0 || 
           navigator.msMaxTouchPoints > 0;
}

/**
 * Дебаунс функция
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Троттлинг функция
 */
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Анимация плавного появления
 */
export function fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let last = +new Date();
    const tick = () => {
        element.style.opacity = +element.style.opacity + (new Date() - last) / duration;
        last = +new Date();
        
        if (+element.style.opacity < 1) {
            requestAnimationFrame(tick);
        }
    };
    
    tick();
}

/**
 * Анимация плавного исчезновения
 */
export function fadeOut(element, duration = 300) {
    element.style.opacity = 1;
    
    let last = +new Date();
    const tick = () => {
        element.style.opacity = +element.style.opacity - (new Date() - last) / duration;
        last = +new Date();
        
        if (+element.style.opacity > 0) {
            requestAnimationFrame(tick);
        } else {
            element.style.display = 'none';
        }
    };
    
    tick();
}

/**
 * Создание элемента с атрибутами
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.substring(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            element.appendChild(child);
        }
    });
    
    return element;
}

/**
 * Удаление всех дочерних элементов
 */
export function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Предзагрузка изображений
 */
export function preloadImages(urls) {
    return Promise.all(
        urls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = reject;
                img.src = url;
            });
        })
    );
}

/**
 * Воспроизведение звука
 */
export function playSound(url, volume = 1.0) {
    try {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(e => console.warn('Ошибка воспроизведения звука:', e));
        return audio;
    } catch (error) {
        console.error('Ошибка создания аудио:', error);
        return null;
    }
}

/**
 * Виброотклик (для мобильных)
 */
export function vibrate(pattern = 50) {
    if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}

/**
 * Получение параметров URL
 */
export function getUrlParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split('&');
    
    pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    });
    
    return params;
}

/**
 * Установка параметров URL
 */
export function setUrlParams(params) {
    const url = new URL(window.location);
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    window.history.replaceState({}, '', url);
}

/**
 * Проверка онлайн-статуса
 */
export function checkOnlineStatus() {
    return navigator.onLine;
}

/**
 * Отслеживание онлайн-статуса
 */
export function onOnlineStatusChange(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
}

/**
 * Форматирование числа с разделителями
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Генерация градиента
 */
export function generateGradient(color1, color2, angle = 45) {
    return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
}

/**
 * Создание шума для фона
 */
export function createNoiseCanvas(width, height, opacity = 0.1) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 255;
        data[i] = noise;     // R
        data[i + 1] = noise; // G
        data[i + 2] = noise; // B
        data[i + 3] = opacity * 255; // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

/**
 * Создание водяного знака
 */
export function createWatermark(text, options = {}) {
    const defaults = {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.1)',
        angle: -45,
        spacing: 100
    };
    
    const config = { ...defaults, ...options };
    
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    
    const ctx = canvas.getContext('2d');
    ctx.font = `${config.fontSize}px Arial`;
    ctx.fillStyle = config.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Поворачиваем контекст
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(config.angle * Math.PI / 180);
    
    // Рисуем текст
    ctx.fillText(text, 0, 0);
    
    return canvas;
}

export default {
    formatTime,
    formatDate,
    random,
    randomColor,
    circleRectCollision,
    circleCircleCollision,
    distance,
    interpolatePosition,
    clamp,
    normalizeVector,
    radToDeg,
    degToRad,
    generateId,
    copyToClipboard,
    saveToStorage,
    loadFromStorage,
    removeFromStorage,
    checkWebGLSupport,
    isMobileDevice,
    isTouchDevice,
    debounce,
    throttle,
    fadeIn,
    fadeOut,
    createElement,
    removeAllChildren,
    preloadImages,
    playSound,
    vibrate,
    getUrlParams,
    setUrlParams,
    checkOnlineStatus,
    onOnlineStatusChange,
    formatNumber,
    generateGradient,
    createNoiseCanvas,
    createWatermark
};
