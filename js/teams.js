// Advanced Team Generation Module with Balance Analysis
class TeamGenerator {
    constructor() {
        this.generatedTeams = [];
        this.balanceMetrics = {};
    }

    // Main team generation function
    generateTeams() {
        if (!window.app) {
            console.error('App not initialized');
            return;
        }

        const signedUpPlayers = window.app.getSignedUpPlayers();
        
        if (signedUpPlayers.length < 6) {
            alert('Need at least 6 players to generate teams');
            return;
        }

        // Determine optimal number of teams
        const numTeams = this.calculateOptimalTeams(signedUpPlayers.length);
        
        // Generate balanced teams
        const teams = this.createBalancedTeams(signedUpPlayers, numTeams);
        
        // Calculate balance metrics
        this.balanceMetrics = this.calculateBalanceMetrics(teams);
        
        // Store generated teams
        this.generatedTeams = teams;
        
        // Render teams and analysis
        this.renderTeams(teams);
        this.renderBalanceAnalysis();
    }

    // Calculate optimal number of teams based on player count
    calculateOptimalTeams(playerCount) {
        if (playerCount <= 8) return 2;
        if (playerCount <= 14) return 2;
        if (playerCount <= 21) return 3;
        return 4; // For very large groups
    }

    // Create balanced teams using advanced algorithm
    createBalancedTeams(players, numTeams) {
        // Sort players by skill points (highest first)
        const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
        
        // Initialize teams
        const teams = Array(numTeams).fill().map((_, i) => ({
            name: `Team ${String.fromCharCode(65 + i)}`, // Team A, B, C, etc.
            players: [],
            totalPoints: 0,
            skillDistribution: {
                excellent: 0,
                good: 0,
                average: 0,
                bad: 0
            }
        }));

        // Use snake draft distribution for better balance
        this.distributePlayersSnakeDraft(sortedPlayers, teams);
        
        // Apply balancing adjustments
        this.optimizeTeamBalance(teams);

        return teams;
    }

    // Snake draft distribution
    distributePlayersSnakeDraft(players, teams) {
        const numTeams = teams.length;
        let currentTeam = 0;
        let direction = 1; // 1 for forward, -1 for backward

        players.forEach((player, index) => {
            // Add player to current team
            teams[currentTeam].players.push(player);
            teams[currentTeam].totalPoints += player.points;
            teams[currentTeam].skillDistribution[player.skill]++;

            // Move to next team
            if (direction === 1) {
                currentTeam++;
                if (currentTeam >= numTeams) {
                    currentTeam = numTeams - 1;
                    direction = -1;
                }
            } else {
                currentTeam--;
                if (currentTeam < 0) {
                    currentTeam = 0;
                    direction = 1;
                }
            }
        });
    }

    // Optimize team balance with swapping algorithm
    optimizeTeamBalance(teams) {
        const maxIterations = 50;
        let improved = true;
        let iteration = 0;

        while (improved && iteration < maxIterations) {
            improved = false;
            iteration++;

            // Try swapping players between teams to improve balance
            for (let i = 0; i < teams.length - 1; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    if (this.trySwapForBalance(teams[i], teams[j])) {
                        improved = true;
                    }
                }
            }
        }
    }

    // Try swapping players between two teams for better balance
    trySwapForBalance(team1, team2) {
        const currentBalance = this.calculateTeamPairBalance(team1, team2);
        let bestImprovement = 0;
        let bestSwap = null;

        // Try all possible swaps
        for (let i = 0; i < team1.players.length; i++) {
            for (let j = 0; j < team2.players.length; j++) {
                const player1 = team1.players[i];
                const player2 = team2.players[j];

                // Simulate swap
                this.simulateSwap(team1, team2, i, j);
                const newBalance = this.calculateTeamPairBalance(team1, team2);
                const improvement = newBalance - currentBalance;

                if (improvement > bestImprovement) {
                    bestImprovement = improvement;
                    bestSwap = { i, j };
                }

                // Undo simulation
                this.simulateSwap(team1, team2, j, i);
            }
        }

        // Apply best swap if found
        if (bestSwap && bestImprovement > 0.1) {
            this.performSwap(team1, team2, bestSwap.i, bestSwap.j);
            return true;
        }

        return false;
    }

    // Simulate a player swap
    simulateSwap(team1, team2, index1, index2) {
        const player1 = team1.players[index1];
        const player2 = team2.players[index2];

        // Swap players
        team1.players[index1] = player2;
        team2.players[index2] = player1;

        // Update totals
        team1.totalPoints = team1.totalPoints - player1.points + player2.points;
        team2.totalPoints = team2.totalPoints - player2.points + player1.points;

        // Update skill distribution
        team1.skillDistribution[player1.skill]--;
        team1.skillDistribution[player2.skill]++;
        team2.skillDistribution[player2.skill]--;
        team2.skillDistribution[player1.skill]++;
    }

    // Perform actual player swap
    performSwap(team1, team2, index1, index2) {
        this.simulateSwap(team1, team2, index1, index2);
    }

    // Calculate balance score for a pair of teams
    calculateTeamPairBalance(team1, team2) {
        const avg1 = team1.totalPoints / team1.players.length;
        const avg2 = team2.totalPoints / team2.players.length;
        const sizeDiff = Math.abs(team1.players.length - team2.players.length);
        
        // Better balance = smaller difference in averages and sizes
        return 100 - (Math.abs(avg1 - avg2) * 10 + sizeDiff * 5);
    }

    // Calculate comprehensive balance metrics
    calculateBalanceMetrics(teams) {
        const metrics = {
            teamAverages: [],
            overallBalance: 0,
            sizeBalance: 0,
            skillBalance: 0,
            recommendation: ''
        };

        // Calculate team averages
        teams.forEach(team => {
            const average = team.players.length > 0 ? team.totalPoints / team.players.length : 0;
            metrics.teamAverages.push(average);
        });

        // Overall balance (lower standard deviation = better balance)
        const mean = metrics.teamAverages.reduce((a, b) => a + b, 0) / metrics.teamAverages.length;
        const variance = metrics.teamAverages.reduce((acc, avg) => acc + Math.pow(avg - mean, 2), 0) / metrics.teamAverages.length;
        const stdDev = Math.sqrt(variance);
        metrics.overallBalance = Math.max(0, 100 - stdDev * 25); // Scale to 0-100

        // Size balance
        const sizes = teams.map(team => team.players.length);
        const maxSize = Math.max(...sizes);
        const minSize = Math.min(...sizes);
        metrics.sizeBalance = Math.max(0, 100 - (maxSize - minSize) * 20);

        // Skill balance (how evenly skills are distributed)
        const skillTotals = { excellent: 0, good: 0, average: 0, bad: 0 };
        teams.forEach(team => {
            Object.keys(skillTotals).forEach(skill => {
                skillTotals[skill] += team.skillDistribution[skill];
            });
        });

        let skillVariance = 0;
        Object.keys(skillTotals).forEach(skill => {
            const teamCounts = teams.map(team => team.skillDistribution[skill]);
            const skillMean = skillTotals[skill] / teams.length;
            const skillVar = teamCounts.reduce((acc, count) => acc + Math.pow(count - skillMean, 2), 0) / teams.length;
            skillVariance += skillVar;
        });
        metrics.skillBalance = Math.max(0, 100 - skillVariance * 10);

        // Generate recommendation
        metrics.recommendation = this.generateRecommendation(metrics);

        return metrics;
    }

    // Generate balance recommendation
    generateRecommendation(metrics) {
        const overall = metrics.overallBalance;
        
        if (overall >= 90) return 'Excellent balance! Teams are very evenly matched.';
        if (overall >= 80) return 'Good balance. Teams should be competitive.';
        if (overall >= 70) return 'Fair balance. Some skill difference between teams.';
        if (overall >= 60) return 'Moderate imbalance. Consider manual adjustments.';
        return 'Significant imbalance detected. Manual team adjustment recommended.';
    }

    // Render teams in the UI
    renderTeams(teams) {
        const container = document.getElementById('teamsContainer');
        if (!container) return;
        
        container.innerHTML = teams.map(team => {
            const average = team.players.length > 0 ? (team.totalPoints / team.players.length).toFixed(1) : '0.0';
            
            return `
                <div class="team">
                    <h3>${team.name}</h3>
                    <div class="team-stats">
                        <div class="stat-row">
                            <span class="stat-label">Players:</span>
                            <span class="stat-value">${team.players.length}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Total Points:</span>
                            <span class="stat-value">${team.totalPoints}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Average:</span>
                            <span class="stat-value">${average}</span>
                        </div>
                    </div>
                    <div class="skill-distribution">
                        <h4>Skill Distribution:</h4>
                        ${Object.entries(team.skillDistribution).map(([skill, count]) => 
                            count > 0 ? `<span class="skill-badge skill-${skill}" style="margin: 2px;">${skill}: ${count}</span>` : ''
                        ).join('')}
                    </div>
                    <div class="team-players">
                        ${team.players.map(player => `
                            <div class="team-player">
                                <div>
                                    <strong>${player.name}</strong>
                                </div>
                                <span class="skill-badge skill-${player.skill}">${player.skill}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render balance analysis
    renderBalanceAnalysis() {
        const container = document.getElementById('balance-analysis');
        if (!container) {
            // Create balance analysis section if it doesn't exist
            const teamsContainer = document.getElementById('teamsContainer');
            if (teamsContainer) {
                const analysisDiv = document.createElement('div');
                analysisDiv.id = 'balance-analysis';
                analysisDiv.style.marginTop = '30px';
                teamsContainer.parentNode.insertBefore(analysisDiv, teamsContainer.nextSibling);
            } else {
                return;
            }
        }

        const analysisContainer = document.getElementById('balance-analysis');
        if (!analysisContainer) return;

        const metrics = this.balanceMetrics;
        
        analysisContainer.innerHTML = `
            <div style="background: white; border-radius: 15px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                <h3>Team Balance Analysis</h3>
                
                <div class="analysis-metrics">
                    <div class="metric-row">
                        <span class="metric-label">Overall Balance:</span>
                        <span class="metric-value ${this.getBalanceClass(metrics.overallBalance)}">${metrics.overallBalance.toFixed(1)}%</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Size Balance:</span>
                        <span class="metric-value ${this.getBalanceClass(metrics.sizeBalance)}">${metrics.sizeBalance.toFixed(1)}%</span>
                    </div>
                    <div class="metric-row">
                        <span class="metric-label">Skill Balance:</span>
                        <span class="metric-value ${this.getBalanceClass(metrics.skillBalance)}">${metrics.skillBalance.toFixed(1)}%</span>
                    </div>
                </div>

                <div class="team-averages">
                    <h4>Team Averages:</h4>
                    ${metrics.teamAverages.map((avg, index) => `
                        <span style="margin-right: 15px;">Team ${String.fromCharCode(65 + index)}: ${avg.toFixed(1)}</span>
                    `).join('')}
                </div>

                <div class="recommendation" style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                    <strong>Recommendation:</strong> ${metrics.recommendation}
                </div>

                <div style="margin-top: 20px;">
                    <button class="btn" onclick="teamGenerator.regenerateTeams()" style="margin-right: 10px;">Regenerate Teams</button>
                    <button class="btn btn-success" onclick="teamGenerator.acceptTeams()">Accept These Teams</button>
                </div>
            </div>
        `;
    }

    // Get CSS class based on balance score
    getBalanceClass(score) {
        if (score >= 80) return 'balance-good';
        if (score >= 60) return 'balance-warning';
        return 'balance-poor';
    }

    // Regenerate teams with different approach
    regenerateTeams() {
        this.generateTeams();
    }

    // Accept current teams
    acceptTeams() {
        alert('Teams accepted! You can now start your game.');
    }

    // Get generated teams
    getGeneratedTeams() {
        return this.generatedTeams;
    }

    // Get balance metrics
    getBalanceMetrics() {
        return this.balanceMetrics;
    }
}

// Global function for onclick handlers
function generateTeams() {
    if (window.teamGenerator) {
        window.teamGenerator.generateTeams();
    }
}

// Initialize team generator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.teamGenerator = new TeamGenerator();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamGenerator;
}