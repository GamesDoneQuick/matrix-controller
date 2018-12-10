'use strict';

// Native
import * as http from 'http';

// Packages
import * as express from 'express';
import * as socketIO from 'socket.io';
import * as SerialPort from '@serialport/stream';
import * as Binding from '@serialport/bindings';
import transformMiddleware from 'express-transform-bare-module-specifiers';

// Ours
import config from './config';
import {SOCKET_MESSAGES} from '../types/socket';
import {HdmiMatrix} from './matricies/hdmi-matrix';

if (process.env.NODE_ENV !== 'test') {
	SerialPort.Binding = Binding;
}

const app = express();
const server = new http.Server(app);
const io = socketIO(server);

export const hdmiMatrix = new HdmiMatrix();

app.use('*', transformMiddleware());
app.use('/node_modules', express.static('node_modules'));
app.use(express.static('public'));

server.listen(config.get('port'), () => {
	console.log(`listening on *:${config.get('port')}`);
});

hdmiMatrix.on(SOCKET_MESSAGES.OUTPUT_STATUSES, () => {
	io.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, hdmiMatrix.state.outputs);
});

io.on('connection', socket => {
	console.log('a user connected');

	// Initialize with the status of each output.
	socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, hdmiMatrix.state.outputs);

	socket.on(SOCKET_MESSAGES.GET_OUTPUTS, () => {
		socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, hdmiMatrix.state.outputs);
	});

	socket.on(SOCKET_MESSAGES.SET_OUTPUT, (unparsedOutput: unknown, unparsedInput: unknown) => {
		console.log('PROCESSING SET_OUTPUT!!!');
		const output = validateAndClamp(unparsedOutput);
		const input = validateAndClamp(unparsedInput);
		hdmiMatrix.setOutput(output, input);
	});
});

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
