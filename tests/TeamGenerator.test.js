// tests/TeamGenerator.test.js
import { TeamGenerator } from '../js/core/TeamGenerator.js';
import { SkillSystem } from '../js/core/SkillSystem.js';

describe('TeamGenerator', () => {
    let teamGenerator;
    let skillSystem;

    beforeEach(() => {
        skillSystem = new SkillSystem();
        teamGenerator = new TeamGenerator(skillSystem);
    });

    describe('generateBalancedTeams', () => {
        test('should generate balanced teams with even players', () => {
            const players = [
                { id: '1', name: 'Player 1', skillLevel: 'good', positions: ['Forward'] },
                { id: '2', name: 'Player 2', skillLevel: 'average', positions: ['Defender'] },
                { id: '3', name: 'Player 3', skillLevel: 'excellent', positions: ['Midfielder'] },
                { id: '4', name: 'Player 4', skillLevel: 'basic', positions: ['Goalkeeper'] }
            ];

            const result = teamGenerator.generateBalancedTeams(players);

            expect(result).toHaveProperty('teamA');
            expect(result).toHaveProperty('teamB');
            expect(result.teamA.players).toHaveLength(2);
            expect(result.teamB.players).toHaveLength(2);
        });

        test('should throw error with insufficient players', () => {
            const players = [
                { id: '1', name: 'Player 1', skillLevel: 'good', positions: ['Forward'] }
            ];

            expect(() => {
                teamGenerator.generateBalancedTeams(players);
            }).toThrow('At least 2 players required');
        });

        test('should balance skill points within acceptable range', () => {
            const players = [
                { id: '1', name: 'Player 1', skillLevel: 'excellent', positions: ['Forward'] },
                { id: '2', name: 'Player 2', skillLevel: 'excellent', positions: ['Defender'] },
                { id: '3', name: 'Player 3', skillLevel: 'basic', positions: ['Midfielder'] },
                { id: '4', name: 'Player 4', skillLevel: 'basic', positions: ['Goalkeeper'] }
            ];

            const result = teamGenerator.generateBalancedTeams(players);
            const pointDifference = Math.abs(result.teamA.totalPoints - result.teamB.totalPoints);

            expect(pointDifference).toBeLessThanOrEqual(2);
        });
    });
});