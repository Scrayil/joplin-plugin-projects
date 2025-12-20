import { Command } from './types';
import Plugin from '../Plugin';
/**
 * This class allows executing or registering new Joplin commands.ts. Commands
 * can be executed or associated with
 * {@link JoplinViewsToolbarButtons | toolbar buttons} or
 * {@link JoplinViewsMenuItems | menu items}.
 *
 * [View the demo plugin](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins/register_command)
 *
 * ## Executing Joplin's internal commands.ts
 *
 * It is also possible to execute internal Joplin's commands.ts which, as of
 * now, are not well documented. You can find the list directly on GitHub
 * though at the following locations:
 *
 * * [Main screen commands.ts](https://github.com/laurent22/joplin/tree/dev/packages/app-desktop/gui/WindowCommandsAndDialogs/commands)
 * * [Global commands.ts](https://github.com/laurent22/joplin/tree/dev/packages/app-desktop/commands)
 * * [Editor commands.ts](https://github.com/laurent22/joplin/tree/dev/packages/app-desktop/gui/NoteEditor/editorCommandDeclarations.ts)
 *
 * To view what arguments are supported, you can open any of these files
 * and look at the `execute()` command.
 *
 * Note that many of these commands.ts only work on desktop. The more limited list of mobile
 * commands.ts can be found in these places:
 *
 * * [Global commands.ts](https://github.com/laurent22/joplin/tree/dev/packages/app-mobile/commands)
 * * [Note screen commands.ts](https://github.com/laurent22/joplin/tree/dev/packages/app-mobile/components/screens/Note/commands)
 * * [Editor commands.ts](https://github.com/laurent22/joplin/blob/dev/packages/app-mobile/components/NoteEditor/commandDeclarations.ts)
 *
 * Additionally, certain global commands.ts have the same implementation on both platforms:
 *
 * * [Shared global commands.ts](https://github.com/laurent22/joplin/tree/dev/packages/lib/commands)
 *
 * ## Executing editor commands.ts
 *
 * There might be a situation where you want to invoke editor commands.ts
 * without using a {@link JoplinContentScripts | contentScript}. For this
 * reason Joplin provides the built in `editor.execCommand` command.
 *
 * `editor.execCommand`  should work with any core command in both the
 * [CodeMirror](https://codemirror.net/doc/manual.html#execCommand) and
 * [TinyMCE](https://www.tiny.cloud/docs/api/tinymce/tinymce.editorcommands/#execcommand) editors,
 * as well as most functions calls directly on a CodeMirror editor object (extensions).
 *
 * * [CodeMirror commands.ts](https://codemirror.net/doc/manual.html#commands)
 * * [TinyMCE core editor commands.ts](https://www.tiny.cloud/docs/advanced/editor-command-identifiers/#coreeditorcommands)
 *
 * `editor.execCommand` supports adding arguments for the commands.ts.
 *
 * ```typescript
 * await joplin.commands.ts.execute('editor.execCommand', {
 *     name: 'madeUpCommand', // CodeMirror and TinyMCE
 *     args: [], // CodeMirror and TinyMCE
 *     ui: false, // TinyMCE only
 *     value: '', // TinyMCE only
 * });
 * ```
 *
 * [View the example using the CodeMirror editor](https://github.com/laurent22/joplin/blob/dev/packages/app-cli/tests/support/plugins/codemirror_content_script/src/index.ts)
 *
 */
export default class JoplinCommands {
    private plugin_;
    constructor(plugin_: Plugin);
    /**
     * Executes the given command.
     *
     * The command can take any number of arguments, and the supported
     * arguments will vary based on the command. For custom commands.ts, this
     * is the `args` passed to the `execute()` function. For built-in
     * commands.ts, you can find the supported arguments by checking the links
     * above.
     *
     * ```typescript
     * // Create a new note in the current notebook:
     * await joplin.commands.ts.execute('newNote');
     *
     * // Create a new sub-notebook under the provided notebook
     * // Note: internally, notebooks are called "folders".
     * await joplin.commands.ts.execute('newFolder', "SOME_FOLDER_ID");
     * ```
     */
    execute(commandName: string, ...args: any[]): Promise<any | void>;
    /**
     * Registers a new command.
     *
     * ```typescript
     * // Register a new commmand called "testCommand1"
     *
     * await joplin.commands.ts.register({
     *     name: 'testCommand1',
     *     label: 'My Test Command 1',
     *     iconName: 'fas fa-music',
     *     execute: () => {
     *         alert('Testing plugin command 1');
     *     },
     * });
     * ```
     */
    register(command: Command): Promise<void>;
}
