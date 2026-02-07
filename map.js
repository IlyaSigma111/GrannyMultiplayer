export const MAP = {
    gridSize: 40,
    width: 20,
    height: 15,
    
    rooms: [
        { id: 'entrance', name: 'Прихожая', x: 7, y: 10, w: 6, h: 5, floor: 1 },
        { id: 'livingroom', name: 'Гостиная', x: 2, y: 5, w: 8, h: 5, floor: 1 },
        { id: 'kitchen', name: 'Кухня', x: 12, y: 8, w: 6, h: 7, floor: 1 },
        { id: 'garage', name: 'Гараж', x: 0, y: 10, w: 6, h: 5, floor: 1 },
        { id: 'dining', name: 'Столовая', x: 7, y: 5, w: 6, h: 5, floor: 1 },
        { id: 'bedroom', name: 'Спальня', x: 2, y: 0, w: 8, h: 5, floor: 2 },
        { id: 'nursery', name: 'Детская', x: 12, y: 0, w: 6, h: 5, floor: 2 },
        { id: 'bathroom', name: 'Ванная', x: 7, y: 0, w: 6, h: 5, floor: 2 }
    ],
    
    objects: [
        { room: 'entrance', x: 8, y: 11, type: 'door', locked: false, leadsTo: 'outside' },
        { room: 'entrance', x: 9, y: 12, type: 'closet', hideInside: true },
        { room: 'entrance', x: 10, y: 11, type: 'stairs', leadsTo: 'floor2' },
        { room: 'livingroom', x: 4, y: 6, type: 'sofa', hideBehind: true },
        { room: 'kitchen', x: 14, y: 10, type: 'refrigerator', hideInside: true },
        { room: 'garage', x: 2, y: 12, type: 'car', hideInside: true },
        { room: 'bedroom', x: 4, y: 2, type: 'bed', hideUnder: true },
        { room: 'nursery', x: 13, y: 1, type: 'toybox', hideInside: true },
        { room: 'entrance', x: 8, y: 13, type: 'trap', active: false },
        { room: 'livingroom', x: 3, y: 7, type: 'trap', active: false }
    ]
};

export function getObjectsInRoom(roomId) {
    return MAP.objects.filter(obj => obj.room === roomId);
}

export function getRoomAt(x, y) {
    return MAP.rooms.find(room => 
        x >= room.x && x < room.x + room.w &&
        y >= room.y && y < room.y + room.h
    );
}

export function gridToPixel(gridX, gridY) {
    return {
        x: gridX * MAP.gridSize,
        y: gridY * MAP.gridSize
    };
}

export function pixelToGrid(pixelX, pixelY) {
    return {
        x: Math.floor(pixelX / MAP.gridSize),
        y: Math.floor(pixelY / MAP.gridSize)
    };
}
