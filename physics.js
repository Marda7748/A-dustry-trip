class PhysicsEngine {
    constructor() {
        this.gravity = 9.8;
        this.friction = 0.3;
        this.airResistance = 0.01;
    }

    calculateVelocity(force, mass, deltaTime) {
        const acceleration = force / mass;
        return acceleration * deltaTime;
    }

    applyFriction(velocity, surface = 'asphalt') {
        const frictionCoefficients = {
            'asphalt': 0.7,
            'dirt': 0.5,
            'sand': 0.3,
            'mud': 0.4
        };
        const coef = frictionCoefficients[surface] || 0.5;
        return velocity * (1 - coef);
    }
}

class VehiclePhysics {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.mass = 1000; // kg
        this.enginePower = 5000; // watts
        this.maxSpeed = 50; // m/s
        this.brake = 0;

        // Engine properties
        this.engineTemp = 50; // celsius
        this.maxEngineTemp = 120;
        this.fuelLevel = 100; // liters
        this.fuelConsumption = 0.5; // L per second at full throttle
        this.fuelPurity = 100; // percentage
        this.oilLevel = 5; // liters
        this.maxOilLevel = 5;

        // Engine damage
        this.engineHealth = 100;
        this.parts = {
            engine: 100,
            radiator: 100,
            door_left: 100,
            door_right: 100,
            hood: 100,
            headlights: 100,
            wheels: [100, 100, 100, 100]
        };
    }

    update(throttle, steering, deltaTime) {
        // Update engine temperature
        this.engineTemp += throttle * 2 - this.oilLevel * 0.5;
        this.engineTemp = Math.max(0, Math.min(this.engineTemp, this.maxEngineTemp));

        // Check for engine damage
        if (this.engineTemp > this.maxEngineTemp) {
            this.parts.engine = Math.max(0, this.parts.engine - 5);
        }

        // Fuel purity affects engine power
        const powerMultiplier = (this.fuelPurity / 100) * 0.5 + 0.5;

        // Calculate force
        const force = this.enginePower * throttle * powerMultiplier / 100;
        const acceleration = force / this.mass;

        // Update velocity
        this.vx += acceleration * Math.cos(this.rotation) * deltaTime;
        this.vy += acceleration * Math.sin(this.rotation) * deltaTime;

        // Apply max speed
        const speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        if (speed > this.maxSpeed) {
            const scale = this.maxSpeed / speed;
            this.vx *= scale;
            this.vy *= scale;
        }

        // Apply braking
        this.vx *= (1 - this.brake * 0.1);
        this.vy *= (1 - this.brake * 0.1);

        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Update rotation based on steering
        this.rotation += steering * 0.05;

        // Consume fuel
        this.fuelLevel -= this.fuelConsumption * throttle * deltaTime / 100;
        this.fuelLevel = Math.max(0, this.fuelLevel);

        // Update oil (decreases with temperature)
        this.oilLevel -= (this.engineTemp / this.maxEngineTemp) * 0.001 * deltaTime;
        this.oilLevel = Math.max(0, this.oilLevel);
    }

    addContaminant(amount, type) {
        // Reduce fuel purity
        this.fuelPurity -= amount;
        this.fuelPurity = Math.max(0, this.fuelPurity);

        if (this.fuelPurity < 85) {
            // Engine starts to stutter
            this.engineHealth -= 0.5;
        }

        if (this.fuelPurity < 15) {
            // Engine won't start
            this.enginePower = 0;
        }
    }

    takeDamage(amount, part) {
        if (part && this.parts[part]) {
            this.parts[part] = Math.max(0, this.parts[part] - amount);
        }
        this.engineHealth = Math.max(0, this.engineHealth - amount * 0.5);
    }
}

class WeatherSystem {
    constructor() {
        this.weatherTypes = ['clear', 'dust', 'sandstorm', 'thunderstorm', 'dust_devil'];
        this.currentWeather = 'clear';
        this.weatherIntensity = 0;
        this.time = 0; // 0-1, where 0.5 is noon
        this.dayLength = 3600; // seconds
    }

    update(deltaTime) {
        this.time += deltaTime / this.dayLength;
        if (this.time > 1) this.time = 0;

        // Random weather changes
        if (Math.random() < 0.001) {
            this.changeWeather();
        }

        // Update intensity
        if (Math.random() < 0.01) {
            this.weatherIntensity = Math.random();
        }
    }

    changeWeather() {
        const random = Math.random();
        if (random < 0.4) this.currentWeather = 'clear';
        else if (random < 0.6) this.currentWeather = 'dust';
        else if (random < 0.85) this.currentWeather = 'sandstorm';
        else if (random < 0.95) this.currentWeather = 'thunderstorm';
        else this.currentWeather = 'dust_devil';
    }

    isNight() {
        return this.time < 0.25 || this.time > 0.75;
    }

    getWeatherForce() {
        const forces = {
            'clear': { x: 0, y: 0 },
            'dust': { x: Math.sin(Date.now() * 0.001) * 100, y: 0 },
            'sandstorm': { x: Math.sin(Date.now() * 0.002) * 500, y: Math.cos(Date.now() * 0.002) * 300 },
            'thunderstorm': { x: 0, y: 0 },
            'dust_devil': { x: Math.sin(Date.now() * 0.005) * 800, y: Math.cos(Date.now() * 0.005) * 800 }
        };
        return forces[this.currentWeather] || { x: 0, y: 0 };
    }
}