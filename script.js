// Global variables
let canvas = null;
let ctx = null;
let gameActive = false;
let player = null;
let vehicle = null;
let gameEngine = null;
let questSystem = null;
let achievementSystem = null;
let upgradeSystem = null;
let weather = null;
let worldGen = null;
let enemies = [];
let items = [];
let particles = [];
let camera = { x: 0, y: 0 };
let keys = {};
let lastFrameTime = Date.now();
let fps = 0;
let inputBuffer = '';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
});

function handleKeyDown(e) {
    keys[e.key.toLowerCase()] = true;
    inputBuffer += e.key;
    
    if (e.key === 'Escape') togglePauseMenu();
    if (e.key === 'i' || e.key === 'I') toggleInventory();
    if (e.key === 'c' || e.key === 'C') switchCamera();
    if (e.key === 'e' || e.key === 'E') enterExitVehicle();
}

function handleKeyUp(e) {
    keys[e.key.toLowerCase()] = false;
}

function startGame() {
    const difficulty = document.getElementById('difficultySelect').value;
    const playerName = document.getElementById('playerName').value || 'Player';
    
    // Initialize game systems
    gameEngine = new GameEngine();
    gameEngine.initialize(difficulty);
    questSystem = new QuestSystem();
    achievementSystem = new AchievementSystem();
    upgradeSystem = new UpgradeSystem();
    weather = new WeatherSystem();
    worldGen = new WorldGenerator();
    
    // Create player and vehicle
    player = {
        x: 400,
        y: 300,
        vx: 0,
        vy: 0,
        radius: 15,
        health: 100,
        maxHealth: 100,
        hunger: 100,
        maxHunger: 100,
        thirst: 100,
        maxThirst: 100,
        stamina: 100,
        maxStamina: 100,
        inVehicle: false,
        inventory: [],
        maxInventory: 20,
        name: playerName,
        speed: 5
    };
    
    vehicle = new VehiclePhysics(400, 300);
    
    // Hide menus and start game
    document.getElementById('mainMenu').classList.remove('active');
    document.getElementById('gameContainer').classList.add('active');
    
    gameActive = true;
    gameLoop();
}

function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;
    
    // Cap deltaTime to prevent spiral of death
    const dt = Math.min(deltaTime, 0.033);
    
    // Update game systems
    if (gameActive) {
        gameEngine.update(dt);
        weather.update(dt);
        
        handleInput(dt);
        updatePlayer(dt);
        if (player.inVehicle) updateVehicle(dt);
        updateEnemies(dt);
        updateItems(dt);
        updateCamera();
        
        // Update UI
        updateHUD();
    }
    
    // Render
    render();
    updateFPS(deltaTime);
    
    if (gameActive) requestAnimationFrame(gameLoop);
}

function handleInput(deltaTime) {
    if (!player.inVehicle) {
        // Player movement
        let moveX = 0, moveY = 0;
        
        if (keys['w'] || keys['arrowup']) moveY -= player.speed * deltaTime;
        if (keys['s'] || keys['arrowdown']) moveY += player.speed * deltaTime;
        if (keys['a'] || keys['arrowleft']) moveX -= player.speed * deltaTime;
        if (keys['d'] || keys['arrowright']) moveX += player.speed * deltaTime;
        
        player.x += moveX;
        player.y += moveY;
        
        // Decay hunger and thirst
        player.hunger = Math.max(0, player.hunger - 0.1 * deltaTime);
        player.thirst = Math.max(0, player.thirst - 0.15 * deltaTime);
        
        if (player.hunger < 20 || player.thirst < 20) {
            player.health -= 0.5 * deltaTime;
        }
    } else {
        // Vehicle controls
        let throttle = 0, steering = 0;
        
        if (keys['w'] || keys['arrowup']) throttle = 100;
        if (keys['s'] || keys['arrowdown']) throttle = -50;
        if (keys['a'] || keys['arrowleft']) steering = -1;
        if (keys['d'] || keys['arrowright']) steering = 1;
        if (keys[' ']) vehicle.brake = 100;
        
        vehicle.update(throttle, steering, deltaTime);
        player.x = vehicle.x;
        player.y = vehicle.y;
    }
}

function updatePlayer(deltaTime) {
    // Update player health based on hunger/thirst
    if (player.hunger < 0 || player.thirst < 0) {
        player.health -= 5 * deltaTime;
    }
    
    player.health = Math.max(0, Math.min(player.health, player.maxHealth));
}

function updateVehicle(deltaTime) {
    // Apply weather forces
    const weatherForce = weather.getWeatherForce();
    vehicle.vx += weatherForce.x * 0.0001 * deltaTime;
    vehicle.vy += weatherForce.y * 0.0001 * deltaTime;
}

function updateEnemies(deltaTime) {
    // Simple enemy spawning
    if (Math.random() < 0.001 * gameEngine.settings.enemySpawn && enemies.length < 20) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 200;
        enemies.push({
            x: player.x + Math.cos(angle) * distance,
            y: player.y + Math.sin(angle) * distance,
            vx: 0,
            vy: 0,
            health: 30,
            maxHealth: 30,
            radius: 20,
            type: Math.random() > 0.7 ? 'flying' : 'wolf',
            speed: 50 + gameEngine.wave * 5
        });
    }
    
    // Update enemies
    enemies = enemies.filter(e => e.health > 0);
    enemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 500) {
            const angle = Math.atan2(dy, dx);
            enemy.vx = Math.cos(angle) * enemy.speed * deltaTime;
            enemy.vy = Math.sin(angle) * enemy.speed * deltaTime;
            
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;
            
            // Collision with player
            if (distance < enemy.radius + player.radius) {
                player.health -= 10 * deltaTime * gameEngine.settings.enemyDamage;
            }
        }
    });
}

function updateItems(deltaTime) {
    items = items.filter(item => item.alive);
}

function updateCamera() {
    if (player.inVehicle) {
        camera.x = vehicle.x - canvas.width / 2;
        camera.y = vehicle.y - canvas.height / 2;
    } else {
        camera.x = player.x - canvas.width / 2;
        camera.y = player.y - canvas.height / 2;
    }
}

function updateHUD() {
    // Update health bar
    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('healthBar').style.width = healthPercent + '%';
    document.getElementById('healthText').textContent = Math.floor(player.health);
    
    // Update hunger bar
    const hungerPercent = (player.hunger / player.maxHunger) * 100;
    document.getElementById('hungerBar').style.width = hungerPercent + '%';
    document.getElementById('hungerText').textContent = Math.floor(player.hunger);
    
    // Update thirst bar
    const thirstPercent = (player.thirst / player.maxThirst) * 100;
    document.getElementById('thirstBar').style.width = thirstPercent + '%';
    document.getElementById('thirstText').textContent = Math.floor(player.thirst);
    
    if (player.inVehicle) {
        // Vehicle stats
        const fuelPercent = (vehicle.fuelLevel / 100) * 100;
        document.getElementById('fuelBar').style.width = fuelPercent + '%';
        document.getElementById('fuelText').textContent = Math.floor(vehicle.fuelLevel) + 'L';
        
        const tempPercent = (vehicle.engineTemp / vehicle.maxEngineTemp) * 100;
        document.getElementById('tempBar').style.width = tempPercent + '%';
        document.getElementById('tempText').textContent = Math.floor(vehicle.engineTemp) + '°C';
        
        const enginePercent = (vehicle.engineHealth / 100) * 100;
        document.getElementById('engineBar').style.width = enginePercent + '%';
        document.getElementById('engineText').textContent = Math.floor(vehicle.engineHealth) + '%';
        
        const purityPercent = vehicle.fuelPurity;
        document.getElementById('purityBar').style.width = purityPercent + '%';
        document.getElementById('purityText').textContent = Math.floor(vehicle.fuelPurity) + '%';
    }
    
    document.getElementById('distance').textContent = 'Distance: ' + Math.floor(gameEngine.distance) + 'm';
}

function updateFPS(deltaTime) {
    fps = Math.round(1 / deltaTime);
    document.getElementById('fps').textContent = 'FPS: ' + fps;
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw weather effect
    if (weather.currentWeather === 'sandstorm') {
        ctx.fillStyle = `rgba(210, 180, 140, ${weather.weatherIntensity * 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (weather.currentWeather === 'dust') {
        ctx.fillStyle = `rgba(210, 180, 140, ${weather.weatherIntensity * 0.1})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw night effect
    if (weather.isNight()) {
        ctx.fillStyle = `rgba(0, 0, 0, ${0.3 + Math.sin(weather.time * Math.PI * 2) * 0.1})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw landmarks
    worldGen.getNearbyLandmarks(camera.x + canvas.width / 2, camera.y + canvas.height / 2).forEach(landmark => {
        const x = landmark.x - camera.x;
        const y = landmark.y - camera.y;
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(x - 20, y - 20, 40, 40);
    });
    
    // Draw player
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.arc(player.x - camera.x, player.y - camera.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw vehicle
    if (vehicle) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(vehicle.x - camera.x - 30, vehicle.y - camera.y - 20, 60, 40);
        
        // Draw wheels
        ctx.fillStyle = '#000000';
        for (let i = 0; i < 4; i++) {
            const wheelX = (i < 2 ? -20 : 20);
            const wheelY = (i % 2 === 0 ? -20 : 20);
            ctx.fillRect(vehicle.x - camera.x + wheelX - 5, vehicle.y - camera.y + wheelY - 5, 10, 10);
        }
    }
    
    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = '#FF00FF';
        ctx.beginPath();
        ctx.arc(enemy.x - camera.x, enemy.y - camera.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        ctx.fillStyle = '#00FF00';
        const healthPercent = (enemy.health / enemy.maxHealth);
        ctx.fillRect(enemy.x - camera.x - 15, enemy.y - camera.y - 30, 30 * healthPercent, 5);
    });
    
    // Draw items
    items.forEach(item => {
        ctx.fillStyle = '#FFFF00';
        ctx.fillRect(item.x - camera.x - 10, item.y - camera.y - 10, 20, 20);
    });
    
    // Draw UI text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '14px Arial';
    ctx.fillText('Weather: ' + weather.currentWeather, 10, 30);
    ctx.fillText('Enemies: ' + enemies.length, 10, 50);
}

function enterExitVehicle() {
    if (!vehicle) return;
    
    const distance = Math.sqrt(
        Math.pow(player.x - vehicle.x, 2) + 
        Math.pow(player.y - vehicle.y, 2)
    );
    
    if (distance < 50) {
        player.inVehicle = !player.inVehicle;
        showNotification(player.inVehicle ? 'Entered vehicle' : 'Exited vehicle');
    }
}

function switchCamera() {
    // Placeholder for camera switching
    showNotification('Camera view switched');
}

function togglePauseMenu() {
    gameActive = !gameActive;
    if (!gameActive) {
        document.getElementById('pauseMenu').classList.add('active');
    } else {
        document.getElementById('pauseMenu').classList.remove('active');
        gameLoop();
    }
}

function resumeGame() {
    gameActive = true;
    document.getElementById('pauseMenu').classList.remove('active');
    gameLoop();
}

function toggleInventory() {
    const inv = document.getElementById('inventoryUI');
    inv.classList.toggle('active');
    if (inv.classList.contains('active')) {
        updateInventoryDisplay();
    }
}

function closeInventory() {
    document.getElementById('inventoryUI').classList.remove('active');
}

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    menu.classList.toggle('active');
}

function updateInventoryDisplay() {
    const inventoryDiv = document.getElementById('inventoryItems');
    inventoryDiv.innerHTML = '';
    
    if (player.inventory.length === 0) {
        inventoryDiv.innerHTML = '<p>Inventory is empty</p>';
    } else {
        player.inventory.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventoryItem';
            itemDiv.textContent = item.name + ' x' + item.quantity;
            inventoryDiv.appendChild(itemDiv);
        });
    }
}

function createLobby() {
    const playerName = document.getElementById('playerName').value || 'Player';
    const code = networkManager.createLobby(playerName);
    document.getElementById('lobbyInfo').innerHTML = 'Lobby Code: <strong>' + code + '</strong>';
    showNotification('Lobby created: ' + code);
}

function joinLobby() {
    const lobbyCode = document.getElementById('lobbyCode').value;
    const playerName = document.getElementById('playerName').value || 'Player';
    
    if (!lobbyCode) {
        showNotification('Please enter a lobby code');
        return;
    }
    
    networkManager.joinLobby(lobbyCode, playerName);
    showNotification('Joining lobby...');
}

function goToMainMenu() {
    gameActive = false;
    document.getElementById('gameContainer').classList.remove('active');
    document.getElementById('mainMenu').classList.add('active');
    document.getElementById('pauseMenu').classList.remove('active');
}

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = 'notification ' + type;
    notif.textContent = message;
    document.getElementById('notifications').appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

function openInventory() {
    toggleInventory();
}

// Initialize networking
networkManager.connect();
