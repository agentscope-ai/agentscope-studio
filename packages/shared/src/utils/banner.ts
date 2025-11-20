/**
 * Display a startup banner for AgentScope Studio
 * Inspired by Phoenix's banner style
 */

import figlet from 'figlet';

interface BannerOptions {
    appName: string;
    version: string;
    port: number;
    databasePath: string;
    mode: 'development' | 'production';
    font?: string;
}

export function displayBanner(options: BannerOptions): void {
    const { version, port, databasePath, mode, font = 'ANSI Shadow' } = options;

    // Generate ASCII art using figlet
    let asciiText: string;
    try {
        asciiText = figlet.textSync('AGENTEORD', {
            font: font,
            horizontalLayout: 'default',
            verticalLayout: 'default',
        });
    } catch (error) {
        console.warn('Failed to generate figlet text, using fallback:', error);
        asciiText = 'AGENTEORD';
    }

    if (!asciiText || asciiText.trim().length === 0) {
        asciiText = 'AGENTEORD';
    }

    // Wrap ASCII art in a border
    const lines = asciiText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) {
        lines.push('AGENTEORD');
    }
    const maxWidth = Math.max(...lines.map((line: string) => line.length));
    const borderWidth = maxWidth + 4; // Add padding for border
    
    const topBorder = '╔' + '═'.repeat(borderWidth - 2) + '╗';
    const bottomBorder = '╚' + '═'.repeat(borderWidth - 2) + '╝';
    const emptyLine = '║' + ' '.repeat(borderWidth - 2) + '║';
    
    // Center the ASCII art
    const centeredLines = lines.map((line: string) => {
        const padding = Math.floor((borderWidth - 2 - line.length) / 2);
        return '║' + ' '.repeat(padding) + line + ' '.repeat(borderWidth - 2 - line.length - padding) + '║';
    });
    
    // Create version line
    const versionText = `AGENTSCOPE-STUDIO  v${version}`;
    const versionPadding = Math.floor((borderWidth - 2 - versionText.length) / 2);
    const versionLine = '║' + ' '.repeat(versionPadding) + versionText + ' '.repeat(borderWidth - 2 - versionText.length - versionPadding) + '║';

    const appNameBanner = [
        topBorder,
        emptyLine,
        ...centeredLines,
        emptyLine,
        versionLine,
        emptyLine,
        bottomBorder,
    ].join('\n');

    // Community and documentation links
    const links = `
🌍  Join our Community  🌍 
https://github.com/agentscope-ai/agentscope-studio

⭐  Leave us a Star  ⭐  
https://github.com/agentscope-ai/agentscope-studio

📚  Documentation  📚  
https://github.com/agentscope-ai/agentscope-studio

🚀  AgentScope Studio Server  🚀
    Studio UI:      http://localhost:${port}
    Mode:           ${mode}
    Log traces:
        HTTP:       http://localhost:${port}/v1/traces
    Storage:        ${databasePath}
`;

    // Display banner with a separator line
    console.log('');
    console.log(appNameBanner);
    console.log(links);
    console.log('');
}
