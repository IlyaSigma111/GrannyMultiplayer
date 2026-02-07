// ==============================================
// audio.js - ПРОСТАЯ СИСТЕМА ЗВУКА
// ==============================================

/**
 * Менеджер звуков
 */
class AudioManager {
    constructor() {
        this.sounds = new Map();
        this.music = new Map();
        this.masterVolume = 0.7;
        this.soundVolume = 0.8;
        this.musicVolume = 0.5;
        this.isMuted = false;
        this.currentMusic = null;
        
        this.audioContext = null;
        this.gainNode = null;
        
        this.init();
    }

    /**
     * Инициализация
     */
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.updateVolume();
            
            // Автовозобновление контекста
            document.addEventListener('click', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });
            
        } catch (error) {
            console.warn('Web Audio API не поддерживается:', error);
        }
        
        // Предзагрузка базовых звуков
        this.preloadSounds();
    }

    /**
     * Предзагрузка звуков
     */
    preloadSounds() {
        const baseSounds = {
            click: 'https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3',
            hover: 'https://assets.mixkit.co/sfx/preview/mixkit-hover-click-1196.mp3',
            notification: 'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3',
            success: 'https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3',
            error: 'https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3',
            footstep: 'https://assets.mixkit.co/sfx/preview/mixkit-slow-heavy-footsteps-496.mp3',
            door: 'https://assets.mixkit.co/sfx/preview/mixkit-door-hinge-squeak-233.mp3',
            hide: 'https://assets.mixkit.co/sfx/preview/mixkit-wooden-small-door-lock-306.mp3',
            catch: 'https://assets.mixkit.co/sfx/preview/mixkit-witch-evil-laugh-148.mp3'
        };
        
        Object.entries(baseSounds).forEach(([name, url]) => {
            this.loadSound(name, url);
        });
    }

    /**
     * Загрузка звука
     */
    async loadSound(name, url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            
            if (this.audioContext) {
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sounds.set(name, audioBuffer);
                console.log(`✅ Звук загружен: ${name}`);
            }
        } catch (error) {
            console.warn(`Не удалось загрузить звук ${name}:`, error);
        }
    }

    /**
     * Загрузка музыки
     */
    loadMusic(name, url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);
            audio.loop = true;
            audio.preload = 'auto';
            
            audio.addEventListener('canplaythrough', () => {
                this.music.set(name, audio);
                resolve();
            });
            
            audio.addEventListener('error', reject);
            audio.src = url;
        });
    }

    /**
     * Воспроизведение звука
     */
    play(name, options = {}) {
        if (this.isMuted || !this.sounds.has(name)) return null;
        
        try {
            if (this.audioContext) {
                return this.playWithWebAudio(name, options);
            } else {
                return this.playWithHTML5(name, options);
            }
        } catch (error) {
            console.warn(`Ошибка воспроизведения звука ${name}:`, error);
            return null;
        }
    }

    /**
     * Воспроизведение через Web Audio API
     */
    playWithWebAudio(name, options) {
        const sound = this.sounds.get(name);
        const source = this.audioContext.createBufferSource();
        source.buffer = sound;
        
        const gainNode = this.audioContext.createGain();
        
        const volume = options.volume !== undefined ? 
            options.volume : this.soundVolume;
        const rate = options.rate || 1;
        const loop = options.loop || false;
        
        source.playbackRate.value = rate;
        source.loop = loop;
        gainNode.gain.value = volume * this.masterVolume;
        
        source.connect(gainNode);
        gainNode.connect(this.gainNode);
        
        source.start(this.audioContext.currentTime + (options.delay || 0));
        
        if (options.duration) {
            setTimeout(() => {
                try { source.stop(); } catch {}
            }, options.duration * 1000);
        }
        
        return source;
    }

    /**
     * Воспроизведение через HTML5 Audio
     */
    playWithHTML5(name, options) {
        const audio = new Audio();
        audio.volume = (options.volume || this.soundVolume) * this.masterVolume;
        audio.playbackRate = options.rate || 1;
        audio.loop = options.loop || false;
        
        // Для демо используем базовые звуки
        const soundMap = {
            click: 'data:audio/mpeg;base64,SUQzBAAAAAA...', // короткая base64 строка
            // другие звуки...
        };
        
        if (soundMap[name]) {
            audio.src = soundMap[name];
        }
        
        audio.play().catch(() => {});
        
        return audio;
    }

    /**
     * Воспроизведение музыки
     */
    playMusic(name, options = {}) {
        if (this.isMuted || !this.music.has(name)) return;
        
        // Останавливаем текущую музыку
        if (this.currentMusic) {
            this.stopMusic();
        }
        
        const music = this.music.get(name);
        this.currentMusic = music;
        
        music.volume = (options.volume || this.musicVolume) * this.masterVolume;
        music.loop = options.loop !== false;
        
        if (options.fadeIn) {
            music.volume = 0;
            music.play();
            
            this.fadeVolume(music, 0, music.volume, 1000);
        } else {
            music.play();
        }
    }

    /**
     * Остановка музыки
     */
    stopMusic(fadeOut = true) {
        if (!this.currentMusic) return;
        
        if (fadeOut) {
            this.fadeVolume(this.currentMusic, this.currentMusic.volume, 0, 1000, () => {
                this.currentMusic.pause();
                this.currentMusic.currentTime = 0;
            });
        } else {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
        }
        
        this.currentMusic = null;
    }

    /**
     * Плавное изменение громкости
     */
    fadeVolume(audio, from, to, duration, onComplete) {
        const startTime = Date.now();
        const startVolume = from;
        
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            audio.volume = startVolume + (to - startVolume) * progress;
            
            if (progress >= 1) {
                clearInterval(fadeInterval);
                if (onComplete) onComplete();
            }
        }, 16);
    }

    /**
     * Переключение звука
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.gainNode.gain.value = 0;
            if (this.currentMusic) {
                this.currentMusic.volume = 0;
            }
        } else {
            this.updateVolume();
            if (this.currentMusic) {
                this.currentMusic.volume = this.musicVolume * this.masterVolume;
            }
        }
        
        return this.isMuted;
    }

    /**
     * Установка громкости
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolume();
        
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume * this.masterVolume;
        }
    }
    
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }
    
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        if (this.currentMusic) {
            this.currentMusic.volume = this.musicVolume * this.masterVolume;
        }
    }

    /**
     * Обновление громкости
     */
    updateVolume() {
        if (this.gainNode && !this.isMuted) {
            this.gainNode.gain.value = this.masterVolume;
        }
    }

    /**
     * Создание звуковых эффектов
     */
    createBeep(frequency, duration, type = 'sine') {
        if (!this.audioContext || this.isMuted) return null;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.gainNode);
        
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.soundVolume * this.masterVolume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        oscillator.start(now);
        oscillator.stop(now + duration);
        
        return oscillator;
    }

    /**
     * Создание уведомления
     */
    createNotificationSound() {
        return this.createBeep(800, 0.1);
    }

    /**
     * Создание звука предупреждения
     */
    createWarningSound() {
        return this.createBeep(400, 0.3, 'square');
    }

    /**
     * Создание звука успеха
     */
    createSuccessSound() {
        return this.createBeep(523.25, 0.3);
    }

    /**
     * Остановка всех звуков
     */
    stopAll() {
        // Останавливаем музыку
        this.music.forEach(music => {
            music.pause();
            music.currentTime = 0;
        });
        
        this.currentMusic = null;
        
        // Пересоздаем AudioContext для остановки всех звуков
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
            this.updateVolume();
        }
    }

    /**
     * Получение статуса
     */
    getStatus() {
        return {
            muted: this.isMuted,
            masterVolume: this.masterVolume,
            soundVolume: this.soundVolume,
            musicVolume: this.musicVolume,
            soundsLoaded: this.sounds.size,
            musicLoaded: this.music.size,
            audioContext: this.audioContext ? this.audioContext.state : 'unsupported'
        };
    }
}

/**
 * Экспорт синглтона
 */
export const audioManager = new AudioManager();
export default audioManager;
