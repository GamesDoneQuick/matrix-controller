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
	skipMatricies: {
		doc: 'Used for testing. If true, skips trying to connect to the matricies.',
		format: Boolean,
		default: false,
		env: 'SKIP_MATRICIES'
	},
	sentry: {
		enabled: {
			doc: 'Whether or not to enable Sentry error reporting.',
			format: Boolean,
			default: true,
			env: 'SENTRY_ENABLED',
			arg: 'sentryEnabled'
		},
		dsn: {
			doc: 'A Sentry project DSN.',
			format: String,
			default: '',
			env: 'SENTRY_DSN',
			arg: 'sentryDsn'
		}
	}
});

if (fs.existsSync('./config.json') && process.env.NODE_ENV !== 'test') {
	conf.loadFile('./config.json');
}

// Perform validation
conf.validate({allowed: 'strict'});

export default conf;
