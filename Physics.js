// ==============================================
// physics.js - УПРОЩЕННАЯ ФИЗИКА
// ==============================================

/**
 * Класс физического движка
 */
class PhysicsEngine {
    constructor() {
        this.objects = [];
        this.collisions = [];
        this.gravity = 0;
        this.friction = 0.85;
        this.elasticity = 0.3;
    }

    /**
     * Добавить объект
     */
    addObject(object) {
        this.objects.push(object);
    }

    /**
     * Удалить объект
     */
    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    /**
     * Обновить физику
     */
    update(deltaTime) {
        // Применяем силы
        this.applyForces(deltaTime);
        
        // Обновляем позиции
        this.updatePositions(deltaTime);
        
        // Проверяем коллизии
        this.checkCollisions();
        
        // Разрешаем коллизии
        this.resolveCollisions();
        
        // Очищаем силы
        this.clearForces();
    }

    /**
     * Применение сил
     */
    applyForces(deltaTime) {
        this.objects.forEach(obj => {
            if (obj.mass && obj.velocity) {
                // Гравитация
                if (this.gravity > 0) {
                    obj.velocity.y += this.gravity * deltaTime;
                }
                
                // Трение
                obj.velocity.x *= this.friction;
                obj.velocity.y *= this.friction;
                
                // Ограничение скорости
                if (obj.maxSpeed) {
                    const speed = Math.sqrt(obj.velocity.x ** 2 + obj.velocity.y ** 2);
                    if (speed > obj.maxSpeed) {
                        obj.velocity.x = (obj.velocity.x / speed) * obj.maxSpeed;
                        obj.velocity.y = (obj.velocity.y / speed) * obj.maxSpeed;
                    }
                }
            }
        });
    }

    /**
     * Обновление позиций
     */
    updatePositions(deltaTime) {
        this.objects.forEach(obj => {
            if (obj.velocity) {
                obj.x += obj.velocity.x * deltaTime;
                obj.y += obj.velocity.y * deltaTime;
            }
        });
    }

    /**
     * Проверка коллизий
     */
    checkCollisions() {
        this.collisions = [];
        
        for (let i = 0; i < this.objects.length; i++) {
            for (let j = i + 1; j < this.objects.length; j++) {
                const obj1 = this.objects[i];
                const obj2 = this.objects[j];
                
                if (this.isColliding(obj1, obj2)) {
                    this.collisions.push({
                        obj1,
                        obj2,
                        normal: this.getCollisionNormal(obj1, obj2),
                        depth: this.getCollisionDepth(obj1, obj2)
                    });
                }
            }
        }
    }

    /**
     * Проверка коллизии двух объектов
     */
    isColliding(obj1, obj2) {
        if (obj1.type === 'circle' && obj2.type === 'circle') {
            return this.circleCircleCollision(obj1, obj2);
        } else if (obj1.type === 'circle' && obj2.type === 'rect') {
            return this.circleRectCollision(obj1, obj2);
        } else if (obj1.type === 'rect' && obj2.type === 'circle') {
            return this.circleRectCollision(obj2, obj1);
        } else if (obj1.type === 'rect' && obj2.type === 'rect') {
            return this.rectRectCollision(obj1, obj2);
        }
        return false;
    }

    /**
     * Коллизия круг-круг
     */
    circleCircleCollision(c1, c2) {
        const dx = c1.x - c2.x;
        const dy = c1.y - c2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (c1.radius + c2.radius);
    }

    /**
     * Коллизия круг-прямоугольник
     */
    circleRectCollision(circle, rect) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        
        return (distanceX * distanceX + distanceY * distanceY) < (circle.radius * circle.radius);
    }

    /**
     * Коллизия прямоугольник-прямоугольник
     */
    rectRectCollision(r1, r2) {
        return r1.x < r2.x + r2.width &&
               r1.x + r1.width > r2.x &&
               r1.y < r2.y + r2.height &&
               r1.y + r1.height > r2.y;
    }

    /**
     * Получение нормали коллизии
     */
    getCollisionNormal(obj1, obj2) {
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return { x: 0, y: 1 };
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    /**
     * Глубина проникновения
     */
    getCollisionDepth(obj1, obj2) {
        if (obj1.type === 'circle' && obj2.type === 'circle') {
            const dx = obj1.x - obj2.x;
            const dy = obj1.y - obj2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return (obj1.radius + obj2.radius) - distance;
        }
        
        return 10; // По умолчанию
    }

    /**
     * Разрешение коллизий
     */
    resolveCollisions() {
        this.collisions.forEach(collision => {
            const { obj1, obj2, normal, depth } = collision;
            
            // Разделяем объекты
            const separation = {
                x: normal.x * depth * 0.5,
                y: normal.y * depth * 0.5
            };
            
            if (!obj1.static) {
                obj1.x -= separation.x;
                obj1.y -= separation.y;
            }
            
            if (!obj2.static) {
                obj2.x += separation.x;
                obj2.y += separation.y;
            }
            
            // Обмен импульсами
            if (obj1.mass && obj2.mass && !obj1.static && !obj2.static) {
                this.exchangeImpulse(obj1, obj2, normal);
            }
        });
    }

    /**
     * Обмен импульсами
     */
    exchangeImpulse(obj1, obj2, normal) {
        const relativeVelocity = {
            x: obj2.velocity.x - obj1.velocity.x,
            y: obj2.velocity.y - obj1.velocity.y
        };
        
        const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
        
        if (velocityAlongNormal > 0) return;
        
        const restitution = Math.min(obj1.restitution || this.elasticity, 
                                    obj2.restitution || this.elasticity);
        
        let impulseScalar = -(1 + restitution) * velocityAlongNormal;
        impulseScalar /= (1 / obj1.mass) + (1 / obj2.mass);
        
        const impulse = {
            x: impulseScalar * normal.x,
            y: impulseScalar * normal.y
        };
        
        if (!obj1.static) {
            obj1.velocity.x -= impulse.x / obj1.mass;
            obj1.velocity.y -= impulse.y / obj1.mass;
        }
        
        if (!obj2.static) {
            obj2.velocity.x += impulse.x / obj2.mass;
            obj2.velocity.y += impulse.y / obj2.mass;
        }
    }

    /**
     * Очистка сил
     */
    clearForces() {
        this.objects.forEach(obj => {
            if (obj.acceleration) {
                obj.acceleration.x = 0;
                obj.acceleration.y = 0;
            }
        });
    }

    /**
     * Луч для проверки видимости
     */
    raycast(startX, startY, endX, endY, ignoreObjects = []) {
        const objects = this.objects.filter(obj => !ignoreObjects.includes(obj));
        
        let closestHit = null;
        let closestDistance = Infinity;
        
        objects.forEach(obj => {
            const hit = this.rayObjectIntersection(startX, startY, endX, endY, obj);
            if (hit) {
                const distance = Math.sqrt(
                    (hit.x - startX) ** 2 + (hit.y - startY) ** 2
                );
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestHit = {
                        object: obj,
                        point: hit,
                        distance: distance,
                        normal: hit.normal
                    };
                }
            }
        });
        
        return closestHit;
    }

    /**
     * Пересечение луча и объекта
     */
    rayObjectIntersection(x1, y1, x2, y2, obj) {
        if (obj.type === 'circle') {
            return this.rayCircleIntersection(x1, y1, x2, y2, obj);
        } else if (obj.type === 'rect') {
            return this.rayRectIntersection(x1, y1, x2, y2, obj);
        }
        return null;
    }

    /**
     * Пересечение луча и круга
     */
    rayCircleIntersection(x1, y1, x2, y2, circle) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        const fx = x1 - circle.x;
        const fy = y1 - circle.y;
        
        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - circle.radius * circle.radius;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return null;
        
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        
        if (t < 0 || t > 1) return null;
        
        const hitX = x1 + t * dx;
        const hitY = y1 + t * dy;
        
        // Нормаль в точке касания
        const normal = {
            x: (hitX - circle.x) / circle.radius,
            y: (hitY - circle.y) / circle.radius
        };
        
        return { x: hitX, y: hitY, normal };
    }

    /**
     * Пересечение луча и прямоугольника
     */
    rayRectIntersection(x1, y1, x2, y2, rect) {
        let tNear = -Infinity;
        let tFar = Infinity;
        let hitNormal = { x: 0, y: 0 };
        
        // Проверяем пересечение с вертикальными сторонами
        if (Math.abs(x2 - x1) < 0.000001) {
            // Луч вертикальный
            if (x1 < rect.x || x1 > rect.x + rect.width) return null;
        } else {
            const t1 = (rect.x - x1) / (x2 - x1);
            const t2 = (rect.x + rect.width - x1) / (x2 - x1);
            
            const tMin = Math.min(t1, t2);
            const tMax = Math.max(t1, t2);
            
            if (tMin > tNear) {
                tNear = tMin;
                hitNormal.x = t1 < t2 ? -1 : 1;
                hitNormal.y = 0;
            }
            
            tFar = Math.min(tFar, tMax);
            
            if (tNear > tFar) return null;
        }
        
        // Проверяем пересечение с горизонтальными сторонами
        if (Math.abs(y2 - y1) < 0.000001) {
            // Луч горизонтальный
            if (y1 < rect.y || y1 > rect.y + rect.height) return null;
        } else {
            const t1 = (rect.y - y1) / (y2 - y1);
            const t2 = (rect.y + rect.height - y1) / (y2 - y1);
            
            const tMin = Math.min(t1, t2);
            const tMax = Math.max(t1, t2);
            
            if (tMin > tNear) {
                tNear = tMin;
                hitNormal.x = 0;
                hitNormal.y = t1 < t2 ? -1 : 1;
            }
            
            tFar = Math.min(tFar, tMax);
            
            if (tNear > tFar) return null;
        }
        
        if (tNear > 1 || tNear < 0) return null;
        
        const hitX = x1 + tNear * (x2 - x1);
        const hitY = y1 + tNear * (y2 - y1);
        
        return { x: hitX, y: hitY, normal: hitNormal };
    }

    /**
     * Проверка видимости
     */
    isVisible(fromX, fromY, toX, toY, ignoreObjects = []) {
        const hit = this.raycast(fromX, fromY, toX, toY, ignoreObjects);
        return !hit || hit.distance > Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2) - 0.1;
    }
}

/**
 * Фабрика объектов
 */
export class PhysicsObjectFactory {
    static createCircle(x, y, radius, options = {}) {
        return {
            type: 'circle',
            x, y, radius,
            velocity: options.velocity || { x: 0, y: 0 },
            acceleration: options.acceleration || { x: 0, y: 0 },
            mass: options.mass || 1,
            restitution: options.restitution || 0.3,
            static: options.static || false,
            maxSpeed: options.maxSpeed || null,
            ...options
        };
    }
    
    static createRect(x, y, width, height, options = {}) {
        return {
            type: 'rect',
            x, y, width, height,
            velocity: options.velocity || { x: 0, y: 0 },
            acceleration: options.acceleration || { x: 0, y: 0 },
            mass: options.mass || 1,
            restitution: options.restitution || 0.3,
            static: options.static || false,
            maxSpeed: options.maxSpeed || null,
            ...options
        };
    }
    
    static createPlayer(x, y, size, options = {}) {
        return this.createCircle(x, y, size, {
            mass: 2,
            restitution: 0.2,
            maxSpeed: 5,
            ...options
        });
    }
    
    static createWall(x, y, width, height) {
        return this.createRect(x, y, width, height, {
            static: true,
            mass: Infinity
        });
    }
    
    static createFurniture(x, y, width, height) {
        return this.createRect(x, y, width, height, {
            static: true,
            mass: Infinity,
            type: 'furniture'
        });
    }
}

export default PhysicsEngine;
