import * as fs from 'fs';
import * as convict from 'convict';

const conf = convict({
	port: {
		doc: 'The port to bind.',
		format: 'port',
		default: 3839,
		env: 'PORT',
		arg: 'port'
	},
	serialPath: {
		doc: 'The path/device to use for serial communications.',
		format: String,
		default: 'COM1',
		env: 'SERIAL_PATH',
		arg: 'serialPath'
	}
});

if (fs.existsSync('./config.json')) {
	conf.loadFile('./config.json');
}

// Perform validation
conf.validate({allowed: 'strict'});

export default conf;
