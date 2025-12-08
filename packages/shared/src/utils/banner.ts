/**
 * Display a startup banner for AgentScope Studio
 * Inspired by Phoenix's banner style
 */

import chalk from 'chalk';
import figlet from 'figlet';

export function displayBanner(
    appName: string,
    version: string,
    port: number,
    otelGrpcPort: number,
    databasePath: string,
    mode: 'development' | 'production',
): void {
    // Create welcome message with border
    const welcomeMessage = `* Welcome to ${chalk.bold('AgentScope-Studio')} v${version}! *`;
    // Strip ANSI codes to calculate the actual display length
    const displayLength =
        // eslint-disable-next-line no-control-regex
        welcomeMessage.replace(/\u001b\[[0-9;]*m/g, '').length;
    const borderLength = displayLength + 4;
    const topBorder = '┌' + '─'.repeat(borderLength - 2) + '┐';
    const bottomBorder = '└' + '─'.repeat(borderLength - 2) + '┘';
    const welcomeBanner = `${topBorder}\n│ ${welcomeMessage} │\n${bottomBorder}`;

    // Generate ASCII art using figlet
    let asciiText: string;
    try {
        asciiText = figlet.textSync(appName, {
            font: 'ANSI Shadow',
            horizontalLayout: 'default',
            verticalLayout: 'default',
        });
    } catch {
        asciiText = appName;
    }

    if (!asciiText || asciiText.trim().length === 0) {
        asciiText = appName;
    }

    // Wrap ASCII art in a border
    const lines = asciiText
        .split('\n')
        .filter((line) => line.trim().length > 0);
    if (lines.length === 0) {
        lines.push(appName);
    }

    const appNameBanner = [...lines].join('\n');

    // Community and documentation links with colors
    const modeColor = mode === 'production' ? chalk.green : chalk.yellow;
    const links = `
${chalk.cyan('🌍  Join our Community  🌍')}
${chalk.blue('https://github.com/agentscope-ai')}

${chalk.yellow('⭐  Leave us a Star  ⭐')}
${chalk.blue('https://github.com/agentscope-ai/agentscope-studio')}

${chalk.magenta('📚  Documentation  📚')}
${chalk.blue('https://github.com/agentscope-ai/agentscope-studio')}

${chalk.green('🚀  AgentScope Studio Server  🚀')}
    ${chalk.bold('Studio UI:')}      ${chalk.cyan(`http://localhost:${port}`)}
    ${chalk.bold('Traces Endpoint:')}
    ${chalk.bold('  - HTTP:')}       ${chalk.cyan(`http://localhost:${port}/v1/traces`)}
    ${chalk.bold('  - gRPC:')}       ${chalk.cyan(`http://localhost:${otelGrpcPort}`)}
    ${chalk.bold('Mode:')}           ${modeColor(mode)}
    ${chalk.bold('Storage:')}        ${chalk.gray(databasePath)}
`;

    // Display banner with a separator line
    console.log('');
    console.log(chalk.cyan(welcomeBanner));
    console.log('');
    console.log(chalk.cyan(appNameBanner));
    console.log(links);
    console.log('');
}
