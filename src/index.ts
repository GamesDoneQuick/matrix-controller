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
import {ComponentMatrix} from './matricies/component-matrix';
import {OUT, IN, HDMI_OUT, HDMI_IN, COMP_OUT, COMP_IN} from '../types/matrix-mappings';

if (process.env.NODE_ENV !== 'test') {
	SerialPort.Binding = Binding;
}

const app = express();
const server = new http.Server(app);
const io = socketIO(server);

export const hdmiMatrix = new HdmiMatrix();
export const componentMatrix = new ComponentMatrix();

const state = {
	outputs: [0, 1, 2, 3, 4, 5, 6, 7]
};

app.use('*', transformMiddleware());
app.use('/node_modules', express.static('node_modules'));
app.use(express.static('public'));

server.listen(config.get('port'), () => {
	console.log(`listening on *:${config.get('port')}`);
});

hdmiMatrix.on(SOCKET_MESSAGES.OUTPUT_STATUSES, updateState);
componentMatrix.on(SOCKET_MESSAGES.OUTPUT_STATUSES, updateState);

io.on('connection', socket => {
	console.log('a user connected');

	// Initialize with the status of each output.
	socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, hdmiMatrix.state.outputs);

	socket.on(SOCKET_MESSAGES.GET_OUTPUTS, () => {
		socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, hdmiMatrix.state.outputs);
	});

	socket.on(SOCKET_MESSAGES.SET_OUTPUT, (unparsedOutput: unknown, unparsedInput: unknown) => {
		const output = validateAndClamp(unparsedOutput, Object.keys(OUT).length);
		const input = validateAndClamp(unparsedInput, Object.keys(IN).length);

		if (isHdmiInput(input)) {
			hdmiMatrix.setOutput(output, input + 4);
		} else if (isComponentInput(input)) {
			componentMatrix.setOutput(output, input - 4);
			hdmiMatrix.setOutput(output, input - 4);
		} else { // SCART input
			componentMatrix.setOutput(output, input - 4);
			hdmiMatrix.setOutput(output, input - 8);
		}

		if (isTvOutput(output) && (isComponentInput(input) || isScartInput(input))) {
			componentMatrix.setOutput(output - 4, input - 4);
		}
	});
});

function isHdmiInput(input: number) {
	return input >= IN.HDMI_1 && input <= IN.HDMI_4;
}

function isComponentInput(input: number) {
	return input >= IN.COMP_1 && input <= IN.COMP_4;
}

function isScartInput(input: number) {
	return input >= IN.SCART_1 && input <= IN.SCART_2;
}

function isTvOutput(output: number) {
	return output >= OUT.TV_1 && output <= OUT.TV_4;
}

function validateAndClamp(unparsed: unknown, max: number) {
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

	if (parsed > max) {
		throw new Error(`Cannot be greater than ${max} (got "${parsed}")`);
	}

	return parsed;
}

function updateState() {
	for (let i = 0; i <= state.outputs.length; i++) {
		if (hdmiMatrix.state.outputs[i] < 4) {
			// HDMI input
			state.outputs[i] = hdmiMatrix.state.outputs[i];
		} else {
			// Component or SCART input
			state.outputs[i] = componentMatrix.state.outputs[i] + 4;
		}
	}

	io.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);
}

export function stop(done: Function) {
	server.close(done);
}
