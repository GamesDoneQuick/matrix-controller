'use strict';

// Native
import * as http from 'http';

// Packages
import * as express from 'express';
import * as socketIO from 'socket.io';
import * as SerialPort from '@serialport/stream';
import * as Binding from '@serialport/bindings';
import transformMiddleware from 'express-transform-bare-module-specifiers';
import debounce = require('lodash.debounce');
import * as Sentry from '@sentry/node';

// Ours
import config from './config';
import {SOCKET_MESSAGES} from '../types/socket';
import {HdmiMatrix} from './matricies/hdmi-matrix';
import {ComponentMatrix} from './matricies/component-matrix';
import {COMP_IN, COMP_OUT, HDMI_IN, IN, OUT} from '../types/matrix-mappings';

if (process.env.NODE_ENV !== 'test') {
	SerialPort.Binding = Binding;
}

if (config.get('sentry.enabled')) {
	Sentry.init({
		dsn: config.get('sentry.dsn')
	});
}

const app = express();
const server = new http.Server(app);
const io = socketIO(server);
const updateState = debounce(_updateState, 250);

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
	socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);

	socket.on(SOCKET_MESSAGES.GET_OUTPUTS, () => {
		socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);
	});

	socket.on(SOCKET_MESSAGES.SET_OUTPUT, (unparsedOutput: unknown, unparsedInput: unknown) => {
		const output = validateAndClamp(unparsedOutput, Object.keys(OUT).length - 1) as OUT;
		const input = validateAndClamp(unparsedInput, Object.keys(IN).length - 1) as IN;
		console.log('SET_OUTPUT | output: %s, input: %s', output, input);

		if (isHdmiInput(input)) {
			const offset = HDMI_IN.HD_1 - IN.HDMI_1;
			hdmiMatrix.setOutput(output, input + offset);
		} else {
			const osscOutput = calcOsscOutput(input);
			switch (input) {
				case IN.COMP_1:
					hdmiMatrix.setOutput(output, HDMI_IN.OSSC_1);
					componentMatrix.setOutput(osscOutput, COMP_IN.COMP_1);
					if (isTvOutput(output)) {
						componentMatrix.setOutput(output, COMP_IN.COMP_1);
					}
					break;
				case IN.COMP_2:
					hdmiMatrix.setOutput(output, HDMI_IN.OSSC_2);
					componentMatrix.setOutput(osscOutput, COMP_IN.COMP_2);
					if (isTvOutput(output)) {
						componentMatrix.setOutput(output, COMP_IN.COMP_2);
					}
					break;
				case IN.COMP_3:
					hdmiMatrix.setOutput(output, HDMI_IN.OSSC_3);
					componentMatrix.setOutput(osscOutput, COMP_IN.COMP_3);
					if (isTvOutput(output)) {
						componentMatrix.setOutput(output, COMP_IN.COMP_3);
					}
					break;
				case IN.COMP_4:
					hdmiMatrix.setOutput(output, HDMI_IN.OSSC_4);
					componentMatrix.setOutput(osscOutput, COMP_IN.COMP_4);
					if (isTvOutput(output)) {
						componentMatrix.setOutput(output, COMP_IN.COMP_4);
					}
					break;
				case IN.SCART_1:
					hdmiMatrix.setOutput(output, HDMI_IN.OSSC_1);
					componentMatrix.setOutput(osscOutput, COMP_IN.SCART_1);
					if (isTvOutput(output)) {
						componentMatrix.setOutput(output, COMP_IN.SCART_1);
					}
					break;
				case IN.SCART_2:
					hdmiMatrix.setOutput(output, HDMI_IN.OSSC_2);
					componentMatrix.setOutput(osscOutput, COMP_IN.SCART_2);
					if (isTvOutput(output)) {
						componentMatrix.setOutput(output, COMP_IN.SCART_2);
					}
					break;
				case IN.SCART_3:
					hdmiMatrix.setOutput(output, HDMI_IN.OSSC_3);
					componentMatrix.setOutput(osscOutput, COMP_IN.SCART_3);
					if (isTvOutput(output)) {
						componentMatrix.setOutput(output, COMP_IN.SCART_3);
					}
					break;
				case IN.SCART_4:
					hdmiMatrix.setOutput(output, HDMI_IN.OSSC_4);
					componentMatrix.setOutput(osscOutput, COMP_IN.SCART_4);
					if (isTvOutput(output)) {
						componentMatrix.setOutput(output, COMP_IN.SCART_4);
					}
					break;
				default:
					// Do nothing.
			}
		}
	});
});

export async function start() {
	const serialports = await SerialPort.list() as {comName: string}[];
	for (const serialport of serialports) {
		console.log(`Checking if ${serialport.comName} is connected to the HDMI matrix...`);
		const isHdmiMatrix = await hdmiMatrix.testCom(serialport.comName);
		if (isHdmiMatrix) {
			console.log(`${serialport.comName} is the HDMI matrix!`);
			hdmiMatrix.comName = serialport.comName;
		} else {
			console.log(`Checking if ${serialport.comName} is connected to the component matrix...`);
			const isComponentMatrix = await componentMatrix.testCom(serialport.comName);
			if (isComponentMatrix) {
				console.log(`${serialport.comName} is the component matrix!`);
				componentMatrix.comName = serialport.comName;
			}
		}

		if (hdmiMatrix.comName && componentMatrix.comName) {
			break;
		}
	}

	if (!hdmiMatrix.comName) {
		throw new Error('could not find HDMI matrix');
	}

	if (!componentMatrix.comName) {
		throw new Error('could not find component matrix');
	}

	return Promise.all([
		hdmiMatrix.init(),
		componentMatrix.init()
	]);
}

export function stop(done: Function) {
	server.close(done);
}

function isHdmiInput(input: number) {
	return input >= IN.HDMI_1 && input <= IN.HDMI_4;
}

function isTvOutput(output: number) {
	return output >= OUT.TV_1 && output <= OUT.TV_4;
}

function calcOsscOutput(input: IN): COMP_OUT {
	let osscOutput = COMP_OUT.OSSC_1;
	if (input === IN.COMP_2 || input === IN.SCART_2) {
		osscOutput = COMP_OUT.OSSC_2;
	} else if (input === IN.COMP_3 || input === IN.SCART_3) {
		osscOutput = COMP_OUT.OSSC_3;
	} else if (input === IN.COMP_4 || input === IN.SCART_4) {
		osscOutput = COMP_OUT.OSSC_4;
	}
	return osscOutput;
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

function _updateState() {
	const len = state.outputs.length;
	for (let outputChannel = 0; outputChannel < len; outputChannel++) {
		let computedOutput = 0;

		const hdmiInput = hdmiMatrix.state.outputs[outputChannel];
		if (hdmiInput === HDMI_IN.HD_1) {
			computedOutput = IN.HDMI_1	;
		} else if (hdmiInput === HDMI_IN.HD_2) {
			computedOutput = IN.HDMI_2;
		} else if (hdmiInput === HDMI_IN.HD_3) {
			computedOutput = IN.HDMI_3;
		} else if (hdmiInput === HDMI_IN.HD_4) {
			computedOutput = IN.HDMI_4;
		} else if (hdmiInput === HDMI_IN.OSSC_1) {
			computedOutput = hooBoy(componentMatrix.state.outputs[COMP_OUT.OSSC_1]);
		} else if (hdmiInput === HDMI_IN.OSSC_2) {
			computedOutput = hooBoy(componentMatrix.state.outputs[COMP_OUT.OSSC_2]);
		} else if (hdmiInput === HDMI_IN.OSSC_3) {
			computedOutput = hooBoy(componentMatrix.state.outputs[COMP_OUT.OSSC_3]);
		} else if (hdmiInput === HDMI_IN.OSSC_4) {
			computedOutput = hooBoy(componentMatrix.state.outputs[COMP_OUT.OSSC_4]);
		}

		state.outputs[outputChannel] = computedOutput;
	}

	console.log('----------------------------------');
	console.log('hdmiMatrix state:     ', hdmiMatrix.state);
	console.log('componentMatrix state:', componentMatrix.state);
	console.log('app state:            ', state);
	console.log('----------------------------------');
	io.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);
}

function hooBoy(compInput: COMP_IN): IN {
	if (compInput === COMP_IN.COMP_1) {
		return IN.COMP_1;
	}
	if (compInput === COMP_IN.COMP_2) {
		return IN.COMP_2;
	}
	if (compInput === COMP_IN.COMP_3) {
		return IN.COMP_3;
	}
	if (compInput === COMP_IN.COMP_4) {
		return IN.COMP_4;
	}
	if (compInput === COMP_IN.SCART_1) {
		return IN.SCART_1;
	}
	if (compInput === COMP_IN.SCART_2) {
		return IN.SCART_2;
	}
	if (compInput === COMP_IN.SCART_3) {
		return IN.SCART_3;
	}
	return IN.SCART_4;
}
