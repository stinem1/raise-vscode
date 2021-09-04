import * as vscode from 'vscode';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import { getConfig } from './common';

const output = vscode.window.createOutputChannel("RAISE");

function execCommand(command: string, filepath: string) {
    output.clear();
    output.show(true);
    exec(`${command} '${filepath}'`).stdout?.on('data', (data: string) => {
        output.append(data); 
    });
}

function runWrapper(command: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const filepath = editor.document.fileName;
        execCommand(command, filepath);
    } else {
        console.warn("No file is currently opened");
    }
}

function typeCheck() {
    runWrapper(getConfig("typecheckCommand"));
};

function compileToSML() {
    runWrapper(getConfig("compileCommand"));
}

function runSML() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        let filepath = editor.document.fileName;

        filepath = filepath.slice(0, -4) + '.sml'; // replace ".rsl" extension with sml

        if (!existsSync(filepath)) {
            console.warn("Could not find an SML file with the same name as the currently opened RSL file");
            return;
        }

        execCommand(getConfig("runCommand"), filepath);
    } else {
        console.warn("No file is currently opened");
    }
}

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('raise.typeCheck', typeCheck));
    context.subscriptions.push(vscode.commands.registerCommand('raise.compileToSML', compileToSML));
    context.subscriptions.push(vscode.commands.registerCommand('raise.runSML', runSML));
}
