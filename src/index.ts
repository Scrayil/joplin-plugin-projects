import joplin from 'api';
import Logger, {TargetType} from '@joplin/utils/Logger';
import {registerJoplinCommands} from "./utils/commands";
import {TaskDashboard} from "./gui/TaskDashboard";
import {registerSettings} from "./utils/settings";

const globalLogger = new Logger();
globalLogger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(globalLogger);

const logger = Logger.create('Projects: Index');

joplin.plugins.register({
	/**
	 * Plugin entry point.
	 * 
	 * Initializes the Task Dashboard singleton, registers the main commands, and
	 * sets up the settings panel. This method acts as the composition root for the
	 * plugin's lifecycle.
	 */
	onStart: async function() {
		await registerSettings()

		await TaskDashboard.getInstance().register();

		await registerJoplinCommands()

		logger.info('Plugin started!');
	},
});
