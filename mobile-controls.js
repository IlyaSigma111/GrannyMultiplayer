if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    document.querySelector('.mobile-controls').style.display = 'flex';
    document.querySelector('.desktop-controls').style.display = 'none';
}

let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

document.addEventListener('contextmenu', (event) => {
    if (event.target.classList.contains('d-btn') || 
        event.target.classList.contains('action-btn')) {
        event.preventDefault();
    }
});
