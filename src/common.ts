import * as vscode from 'vscode';

export function getConfig(field: string) : string {
    const parts = ['raise', ...field.split('.')];
    const last = parts.pop()!;
    return vscode.workspace.getConfiguration(parts.join("."))[last];
}

export function reportCmdFailure(command: string, exitCode: number) {
    let msg = `Failed to execute command: '${command}'.`;
          
    if (exitCode == dockerExitCode) {
        msg += ` Perhaps the Docker Engine is not running?`
    }
    
    vscode.window.showErrorMessage(msg);
}

export const delimiter: string = process.platform == 'win32' ? '"' : '\'';
export const dockerExitCode: number = process.platform == 'win32' ? 127 : 125;
