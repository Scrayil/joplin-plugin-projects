import joplin from 'api';
import Logger, {TargetType} from '@joplin/utils/Logger';
import {registerJoplinCommands} from "./utils/commands";
import {TaskDashboard} from "./gui/TaskDashboard";

const globalLogger = new Logger();
globalLogger.addTarget(TargetType.Console);
Logger.initializeGlobalLogger(globalLogger);

const logger = Logger.create('Projects: Index');

joplin.plugins.register({
	onStart: async function() {

		// Initialize the Dashboard View
		await TaskDashboard.getInstance().register();

		// Registering commands.ts and related menu options
		await  registerJoplinCommands()

		logger.info('Plugin started!');
	},
});
