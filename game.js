class GameEngine {
    constructor() {
        this.gameState = 'loading';
        this.difficulty = 'normal';
        this.distance = 0;
        this.score = 0;
        this.time = 0;
        this.wave = 0;
        this.resources = {
            fuel: 100,
            water: 50,
            food: 50,
            oil: 5,
            parts: 10,
            ammo: 100
        };
    }

    initialize(difficulty) {
        this.difficulty = difficulty;
        const difficultySettings = {
            'easy': { enemySpawn: 0.5, enemyDamage: 0.5, resourceDensity: 2 },
            'normal': { enemySpawn: 1, enemyDamage: 1, resourceDensity: 1 },
            'hard': { enemySpawn: 1.5, enemyDamage: 1.5, resourceDensity: 0.7 },
            'impossible': { enemySpawn: 2, enemyDamage: 2, resourceDensity: 0.5 }
        };
        this.settings = difficultySettings[difficulty];
    }

    update(deltaTime) {
        this.time += deltaTime;
        this.distance += 0.1 * deltaTime;

        // Increase wave every 30 seconds
        if (Math.floor(this.time / 30) > this.wave) {
            this.wave = Math.floor(this.time / 30);
            this.onWaveIncrease();
        }
    }

    onWaveIncrease() {
        this.score += 1000 * (this.wave + 1);
    }

    addResource(type, amount) {
        this.resources[type] += amount;
    }

    useResource(type, amount) {
        if (this.resources[type] >= amount) {
            this.resources[type] -= amount;
            return true;
        }
        return false;
    }
}

class QuestSystem {
    constructor() {
        this.activeQuests = [];
        this.completedQuests = [];
        this.questTemplates = [
            { id: 'survive_100m', title: 'Survive 100m', reward: 500, target: 100 },
            { id: 'kill_5_mutants', title: 'Kill 5 Mutants', reward: 1000, target: 5 },
            { id: 'collect_500_fuel', title: 'Collect 500L Fuel', reward: 2000, target: 500 },
            { id: 'drive_1km', title: 'Drive 1km', reward: 5000, target: 1000 },
            { id: 'repair_engine', title: 'Repair Engine', reward: 800, target: 1 }
        ];
    }

    generateQuest() {
        const template = this.questTemplates[Math.floor(Math.random() * this.questTemplates.length)];
        return { ...template, progress: 0 };
    }

    updateProgress(questId, amount) {
        const quest = this.activeQuests.find(q => q.id === questId);
        if (quest) {
            quest.progress += amount;
            if (quest.progress >= quest.target) {
                this.completeQuest(quest);
                return true;
            }
        }
        return false;
    }

    completeQuest(quest) {
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        this.completedQuests.push(quest);
        return quest.reward;
    }
}

class AchievementSystem {
    constructor() {
        this.achievements = [
            { id: 'first_blood', title: 'First Blood', description: 'Kill your first enemy' },
            { id: 'long_journey', title: 'Long Journey', description: 'Travel 5km' },
            { id: 'master_mechanic', title: 'Master Mechanic', description: 'Repair all vehicle parts' },
            { id: 'survivor', title: 'Survivor', description: 'Survive for 10 minutes' },
            { id: 'collector', title: 'Collector', description: 'Collect all resource types' }
        ];
        this.unlockedAchievements = [];
    }

    unlock(achievementId) {
        if (!this.unlockedAchievements.includes(achievementId)) {
            this.unlockedAchievements.push(achievementId);
            const achievement = this.achievements.find(a => a.id === achievementId);
            if (achievement) {
                showNotification(`Achievement Unlocked: ${achievement.title}`, 'success');
            }
        }
    }
}

class UpgradeSystem {
    constructor() {
        this.upgrades = {
            engine: { level: 0, maxLevel: 5, cost: 1000, benefit: 'Increase engine power' },
            armor: { level: 0, maxLevel: 5, cost: 500, benefit: 'Reduce damage taken' },
            fuel_tank: { level: 0, maxLevel: 5, cost: 800, benefit: 'Increase fuel capacity' },
            radiator: { level: 0, maxLevel: 3, cost: 600, benefit: 'Better cooling' },
            wheels: { level: 0, maxLevel: 4, cost: 400, benefit: 'Better traction' }
        };
    }

    canUpgrade(upgradeType) {
        const upgrade = this.upgrades[upgradeType];
        return upgrade && upgrade.level < upgrade.maxLevel;
    }

    upgrade(upgradeType, cost) {
        if (this.canUpgrade(upgradeType) && cost >= this.upgrades[upgradeType].cost) {
            this.upgrades[upgradeType].level++;
            return this.upgrades[upgradeType].cost;
        }
        return 0;
    }
}

class WorldGenerator {
    constructor(seed = Date.now()) {
        this.seed = seed;
        this.landmarks = [];
        this.generateWorld();
    }

    generateWorld() {
        // Generate random landmarks
        for (let i = 0; i < 50; i++) {
            this.landmarks.push({
                x: Math.random() * 10000,
                y: Math.random() * 10000,
                type: ['building', 'rock', 'tree', 'wreck'][Math.floor(Math.random() * 4)],
                resources: Math.floor(Math.random() * 500)
            });
        }
    }

    getNearbyLandmarks(x, y, radius = 500) {
        return this.landmarks.filter(l => {
            const dx = l.x - x;
            const dy = l.y - y;
            return Math.sqrt(dx * dx + dy * dy) < radius;
        });
    }
}