import * as vscode from 'vscode';
import { exec } from 'child_process';
import { existsSync } from 'fs';
import { getConfig, reportCmdFailure, delimiter } from './common';
import { dirname, basename } from 'path';
import { promises as fs } from 'fs';

const output = vscode.window.createOutputChannel("RAISE");

function execCommand(command: string, filepath: string) : Promise<string> {
    output.clear();
    output.show(true);

    const dir = dirname(filepath);
    const file = basename(filepath);

    return new Promise<string>((resolve, _) => {
        const child = exec(`${command} ${delimiter}${file}${delimiter}`,
            { cwd: dir },
            (error, _stdout, _stderr) => { 
                if (error) {
                    reportCmdFailure(command, error?.code ?? 1);
                }
                resolve(_stdout);
            });

        child.stdout?.on('data', (data: string) => {
            output.append(data); 
        });
    });
}

function runWrapper(run: (filepath: string) => Promise<string | void>) {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId == 'rsl') {
        const filepath = editor.document.fileName;
        run(filepath)
    } else {
        const msg = "The currently opened file is not an RSL file";
        console.warn(msg);
        vscode.window.showWarningMessage(msg);
    }
}

async function typeCheck(filepath: string) {
    return execCommand(getConfig("commands.typecheck"), filepath)
}

async function compileToSML(filepath: string) {
    return execCommand(getConfig("commands.compile"), filepath)
}

async function runSML(filepath: string) {
    filepath = filepath.slice(0, -4) + '.sml'; // replace ".rsl" extension with sml

    if (!existsSync(filepath)) {
        const msg = "Could not find an SML file with the same name as the currently opened RSL file";
        console.warn(msg);
        vscode.window.showWarningMessage(msg);
        return;
    }

    return execCommand(getConfig("commands.execute"), filepath);
}

function extractResults(smlResults: string) {
    const separator = "<sig>\nopen";
    let pos = smlResults.lastIndexOf(separator) + separator.length;
    pos = smlResults.indexOf("\n", pos);
    if (pos == -1) return '';

    let coverageMessageString = /^Unexecuted expressions in |Complete expression coverage of /;
    let results = smlResults.substring(pos + 1).split("\n");

    results = results.filter(line => 
        line != "val it = () : unit" && 
        line != "- " && 
        !coverageMessageString.test(line)
    );

    return results.join("\n");
}

async function saveResults(filepath: string) {
    try {
        await compileToSML(filepath);
        const smlResults = await runSML(filepath);

        if (smlResults) { 
            const extractedResults = extractResults(smlResults);

            if (extractedResults.length == 0) {
                vscode.window.showInformationMessage("There were no test results to extract");
            } else {
                filepath = filepath.slice(0, -4) + '.sml.results';
                await fs.writeFile(filepath, extractedResults);
            }
        } else {
            console.error("Could not find a matching SML file to run");
        }
    } catch (error) {
        console.error("Failed to save results:", error);
        vscode.window.showErrorMessage("Failed to save results to file");
    }
}

export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('raise.typeCheck', () => runWrapper(typeCheck)));
    context.subscriptions.push(vscode.commands.registerCommand('raise.compileToSML', () => runWrapper(compileToSML)));
    context.subscriptions.push(vscode.commands.registerCommand('raise.runSML', () => runWrapper(runSML)));
    context.subscriptions.push(vscode.commands.registerCommand('raise.saveResults', () => runWrapper(saveResults)));
}
