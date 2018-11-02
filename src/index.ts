/// <reference path="types/serialport--parser-readline.d.ts" />
/// <reference path="types/serialport--stream.d.ts" />
'use strict';

// Native
import * as http from 'http';

// Packages
import * as express from 'express';
import * as socketIO from 'socket.io';
import * as SerialPort from '@serialport/stream';
import * as Readline from '@serialport/parser-readline';

// Ours
import config from './config';

const OUTPUT_REGEX = /\d{2}/g;

const app = express();
const server = new http.Server(app);
const io = socketIO(server);
export const serialport = new SerialPort(config.get('serialPath'), {
	baudRate: 57600,
	dataBits: 8,
	stopBits: 1,
	parity: 'none'
});

const parser = serialport.pipe(new Readline({delimiter: '\r\n'}));
const state = {
	outputs: [0, 1, 2, 3, 4, 5, 6, 7]
};

export const enum SOCKET_MESSAGES {
	SET_OUTPUT = 'SET_OUTPUT',
	GET_OUTPUTS = 'GET_OUTPUTS',
	OUTPUT_STATUSES = 'OUTPUT_STATUSES'
}

app.get('/', (_req, res) => {
	res.send('<h1>Jacked up and good to go.</h1>');
});

server.listen(config.get('port'), () => {
	console.log(`listening on *:${config.get('port')}`);
});

io.on('connection', socket => {
	console.log('a user connected');

	// Initialize with the status of each output.
	socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);

	socket.on(SOCKET_MESSAGES.GET_OUTPUTS, () => {
		socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);
	});

	socket.on(SOCKET_MESSAGES.SET_OUTPUT, (unparsedOutput: unknown, unparsedInput: unknown) => {
		const output = validateAndClamp(unparsedOutput);
		const input = validateAndClamp(unparsedInput);
		serialport.write(`>@WVSO[0${output + 1}]I[0${input + 1}]\r\n`);
	});
});

serialport.on('open', async () => {
	console.log('serialport open, requesting status');
	requestFullUpdate();
});

serialport.on('error', (error: Error) => {
	console.error('serialport error:', error);
});

serialport.on('close', (error: Error) => {
	console.error('serialport closed:', error ? error : 'no error');
});

parser.on('data', (data: String) => {
	console.log('serialport data:', data);
	if (data.startsWith('OUT CHANGE SET')) {
		const matches = data.match(OUTPUT_REGEX);
		if (matches) {
			state.outputs = matches.map(match => {
				return parseInt(match, 10) - 1;
			});

			// Inform all clients of the update.
			io.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);
		}
	} else if (data.startsWith('<@WVSO')) {
		requestFullUpdate();
	}
});

function requestFullUpdate() {
	console.log('request full update!!!');
	serialport.write('>@R8006\r\n');
}

function validateAndClamp(unparsed: unknown) {
	let parsed: number;
	if (typeof unparsed === 'string') {
		parsed = parseInt(unparsed, 10);
	} else if (typeof unparsed === 'number') {
		parsed = unparsed;
	} else {
		throw new Error(`Unexpected type (got "${typeof unparsed}"`);
	}

	if (isNaN(parsed)) {
		throw new Error(`Must be a number (got "${unparsed}")`);
	}

	if (parsed < 0) {
		throw new Error(`Cannot be less than 0 (got "${parsed}")`);
	}

	if (parsed > 7) {
		throw new Error(`Cannot be greater than 7 (got "${parsed}")`);
	}

	return parsed;
}

export function stop(done: Function) {
	server.close(done);
}
