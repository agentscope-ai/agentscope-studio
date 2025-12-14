import { PATHS } from './server';
import fs from 'fs';
import { BackendResponse } from '../types';
import path from 'path';
import { runPythonScript } from '../../../server/src/trpc/socket';
import { execSync } from 'child_process';

export interface FridayConfig {
    pythonEnv: string;
    mainScriptPath?: string;
    llmProvider: string;
    modelName: string;
    writePermission: boolean;
    baseUrl?: string;
}

export class FridayConfigManager {
    private static instance: FridayConfigManager;
    private config: FridayConfig | null;

    private constructor() {
        this.config = null;
        this.loadFridayConfig();
    }

    static getInstance() {
        if (!FridayConfigManager.instance) {
            FridayConfigManager.instance = new FridayConfigManager();
        }
        return FridayConfigManager.instance;
    }

    private loadFridayConfig() {
        const fridayConfigPath = PATHS.getFridayConfigPath();
        try {
            if (fs.existsSync(fridayConfigPath)) {
                const fridayConfig = JSON.parse(
                    fs.readFileSync(fridayConfigPath, 'utf8'),
                );
                this.config = { ...this.config, ...fridayConfig };
            }
        } catch (error) {
            console.error('Failed to load friday config:', error);
        }
    }

    getConfig() {
        return this.config;
    }

    saveConfig() {
        try {
            const fridayConfigPath = PATHS.getFridayConfigPath();
            fs.mkdirSync(path.dirname(fridayConfigPath), { recursive: true });
            console.debug(
                'Saving friday config to:',
                fridayConfigPath,
                this.config,
            );

            fs.writeFileSync(
                fridayConfigPath,
                JSON.stringify(this.config, null, 2),
            );
        } catch (error) {
            console.error('Failed to save friday config:', error);
        }
    }

    updateConfig(newConfig: FridayConfig) {
        this.config = newConfig;
        this.saveConfig();
    }

    verifyPythonEnv(pythonEnv: string) {
        const pythonPath = path.normalize(pythonEnv);
        // Check if the file exists
        if (!fs.existsSync(pythonPath)) {
            return {
                success: false,
                message: 'The Python environment path does not exist.',
            } as BackendResponse;
        }

        // Check if the path is a file
        try {
            const stats = fs.statSync(pythonPath);
            if (!stats.isFile()) {
                return {
                    success: false,
                    message: 'Not a valid Python environment path.',
                } as BackendResponse;
            }
        } catch (error) {
            return {
                success: false,
                message: `Error accessing Python environment path: ${error}`,
            } as BackendResponse;
        }

        // Check if the python version is 3.10 or higher
        try {
            const cmd =
                process.platform === 'win32'
                    ? `"${pythonPath}" --version`
                    : `${pythonPath} --version`;

            const versionOutput = execSync(cmd, { encoding: 'utf8' })
                .toString()
                .trim();
            const versionMatch = versionOutput.match(/Python (\d+)\.(\d+)/);
            if (!versionMatch) {
                return {
                    success: false,
                    message: 'Failed to get Python version.',
                } as BackendResponse;
            }
            const major = parseInt(versionMatch[1], 10);
            const minor = parseInt(versionMatch[2], 10);
            if (major < 3 || (major === 3 && minor < 10)) {
                return {
                    success: false,
                    message: 'Python version must be 3.10 or higher.',
                } as BackendResponse;
            }
            return {
                success: true,
                message: 'Configuration is valid.',
            } as BackendResponse;
        } catch {
            return {
                success: false,
                message: 'Not a valid Python environment.',
            } as BackendResponse;
        }
    }

    async installRequirements(pythonEnv: string) {
        const res = await runPythonScript(pythonEnv, [
            '-m',
            'pip',
            'install',
            'agentscope[full]',
        ]);
        console.debug('Install requirements:', res);
        if (res.success) {
            return {
                success: true,
                message: 'Successfully installed requirements',
            } as BackendResponse;
        } else {
            return {
                success: false,
                message: `Failed to install requirements: ${res.error}`,
            } as BackendResponse;
        }
    }

    getDefaultMainScriptPath() {
        if (process.env.NODE_ENV === 'production') {
            // In production, the structure is:
            // dist/
            //   server/
            //     src/
            //       index.js (current __dirname)
            //   app/
            //     friday/
            //       main.py
            return path.join(__dirname, '../../../app/friday/main.py');
        }

        // In development, the structure is:
        // packages/
        //   server/
        //     src/
        //       index.ts (current __dirname)
        //   app/
        //     friday/
        //       main.py
        return path.join(__dirname, '../../../app/friday/main.py');
    }
}
