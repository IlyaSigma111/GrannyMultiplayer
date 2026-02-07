// Упрощенная карта дома Granny (вид сверху)
// Каждая комната: [x, y, width, height, тип, массив объектов]
export const MAP = {
    gridSize: 40, // Размер клетки в пикселях
    width: 20,    // Ширина в клетках
    height: 15,   // Высота в клетках
    
    rooms: [
        // Первый этаж
        { id: 'entrance', name: 'Прихожая', x: 7, y: 10, w: 6, h: 5, floor: 1 },
        { id: 'livingroom', name: 'Гостиная', x: 2, y: 5, w: 8, h: 5, floor: 1 },
        { id: 'kitchen', name: 'Кухня', x: 12, y: 8, w: 6, h: 7, floor: 1 },
        { id: 'garage', name: 'Гараж', x: 0, y: 10, w: 6, h: 5, floor: 1 },
        { id: 'dining', name: 'Столовая', x: 7, y: 5, w: 6, h: 5, floor: 1 },
        
        // Второй этаж
        { id: 'bedroom', name: 'Спальня', x: 2, y: 0, w: 8, h: 5, floor: 2 },
        { id: 'nursery', name: 'Детская', x: 12, y: 0, w: 6, h: 5, floor: 2 },
        { id: 'bathroom', name: 'Ванная', x: 7, y: 0, w: 6, h: 5, floor: 2 }
    ],
    
    // Объекты: [x, y, тип, параметры]
    objects: [
        // Прихожая
        { room: 'entrance', x: 8, y: 11, type: 'door', locked: false, leadsTo: 'outside' },
        { room: 'entrance', x: 9, y: 12, type: 'closet', hideInside: true },
        { room: 'entrance', x: 10, y: 11, type: 'stairs', leadsTo: 'floor2' },
        
        // Гостиная
        { room: 'livingroom', x: 4, y: 6, type: 'sofa', hideBehind: true },
        { room: 'livingroom', x: 5, y: 7, type: 'table' },
        { room: 'livingroom', x: 6, y: 6, type: 'fireplace' },
        
        // Кухня
        { room: 'kitchen', x: 14, y: 10, type: 'refrigerator', hideInside: true },
        { room: 'kitchen', x: 13, y: 11, type: 'table' },
        { room: 'kitchen', x: 15, y: 9, type: 'door', locked: true, leadsTo: 'backyard' },
        
        // Гараж
        { room: 'garage', x: 2, y: 12, type: 'car', hideInside: true },
        { room: 'garage', x: 3, y: 11, type: 'workbench' },
        
        // Спальня
        { room: 'bedroom', x: 4, y: 2, type: 'bed', hideUnder: true },
        { room: 'bedroom', x: 5, y: 1, type: 'closet', hideInside: true },
        
        // Детская
        { room: 'nursery', x: 14, y: 2, type: 'crib' },
        { room: 'nursery', x: 13, y: 1, type: 'toybox', hideInside: true },
        
        // Ловушки (случайные позиции)
        { room: 'entrance', x: 8, y: 13, type: 'trap', active: false },
        { room: 'livingroom', x: 3, y: 7, type: 'trap', active: false },
        { room: 'kitchen', x: 14, y: 12, type: 'trap', active: false }
    ],
    
    // Выходы для победы
    exits: [
        { x: 8, y: 14, type: 'mainDoor', room: 'entrance', requiresKey: true }
    ]
};

// Получить объекты в комнате
export function getObjectsInRoom(roomId) {
    return MAP.objects.filter(obj => obj.room === roomId);
}

// Получить комнату по координатам
export function getRoomAt(x, y) {
    return MAP.rooms.find(room => 
        x >= room.x && x < room.x + room.w &&
        y >= room.y && y < room.y + room.h
    );
}

// Конвертировать координаты клеток в пиксели
export function gridToPixel(gridX, gridY) {
    return {
        x: gridX * MAP.gridSize,
        y: gridY * MAP.gridSize
    };
}

// Конвертировать пиксели в координаты клеток
export function pixelToGrid(pixelX, pixelY) {
    return {
        x: Math.floor(pixelX / MAP.gridSize),
        y: Math.floor(pixelY / MAP.gridSize)
    };
}
