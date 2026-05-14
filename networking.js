class NetworkManager {
    constructor() {
        this.serverUrl = 'wss://your-server.com/game'; // Update with your server
        this.ws = null;
        this.connected = false;
        this.playerId = this.generateId();
        this.lobbyCode = null;
        this.players = {};
        this.callbacks = {};
    }

    generateId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    connect() {
        try {
            this.ws = new WebSocket(this.serverUrl);
            this.ws.onopen = () => this.onConnected();
            this.ws.onmessage = (event) => this.onMessage(event);
            this.ws.onerror = (error) => this.onError(error);
            this.ws.onclose = () => this.onDisconnected();
        } catch (e) {
            console.warn('WebSocket not available, running in offline mode');
            this.connected = false;
        }
    }

    onConnected() {
        this.connected = true;
        console.log('Connected to game server');
        this.emit('connected');
    }

    onDisconnected() {
        this.connected = false;
        console.log('Disconnected from server');
        this.emit('disconnected');
    }

    onError(error) {
        console.error('Network error:', error);
        this.emit('error', error);
    }

    onMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.emit(data.type, data);
        } catch (e) {
            console.error('Failed to parse message:', e);
        }
    }

    createLobby(playerName) {
        this.lobbyCode = this.generateId().substring(0, 8).toUpperCase();
        this.send({
            type: 'createLobby',
            lobbyCode: this.lobbyCode,
            playerId: this.playerId,
            playerName: playerName
        });
        return this.lobbyCode;
    }

    joinLobby(lobbyCode, playerName) {
        this.lobbyCode = lobbyCode;
        this.send({
            type: 'joinLobby',
            lobbyCode: lobbyCode,
            playerId: this.playerId,
            playerName: playerName
        });
    }

    sendGameState(gameState) {
        this.send({
            type: 'gameState',
            playerId: this.playerId,
            lobbyCode: this.lobbyCode,
            playerPos: gameState.playerPos,
            vehiclePos: gameState.vehiclePos,
            health: gameState.health,
            timestamp: Date.now()
        });
    }

    send(data) {
        if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('Not connected to server, message queued');
        }
    }

    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, data = null) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(cb => cb(data));
        }
    }
}

const networkManager = new NetworkManager();