// js/types/globals.d.ts - TypeScript declaration file to fix Window property errors
declare global {
    interface Window {
        SKILL_LEVELS: {
            [key: string]: {
                label: string;
                points: number;
                description: string;
            }
        };
        getSkillPoints: (skillLevel: string) => number;
        getSkillInfo: (skillLevel: string) => any;
        authManager: any;
        dataSync: any;
        app: any;
        updateAdminSignupWeek: () => Promise<void>;
    }
}

export {};