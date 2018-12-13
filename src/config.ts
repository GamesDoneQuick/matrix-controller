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
	hdmiSerialPath: {
		doc: 'The path/device to use for serial communications.',
		format: String,
		default: 'COM1',
		env: 'HDMI_SERIAL_PATH',
		arg: 'hdmiSerialPath'
	},
	componentSerialPath: {
		doc: 'The path/device to use for serial communications.',
		format: String,
		default: 'COM2',
		env: 'COMPONENT_SERIAL_PATH',
		arg: 'componentSerialPath'
	}
});

if (fs.existsSync('./config.json') && process.env.NODE_ENV !== 'test') {
	conf.loadFile('./config.json');
}

// Perform validation
conf.validate({allowed: 'strict'});

export default conf;
