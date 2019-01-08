'use strict';

// Native
import * as http from 'http';
// Packages
import * as express from 'express';
import * as socketIO from 'socket.io';
import * as SerialPort from '@serialport/stream';
import * as Binding from '@serialport/bindings';
import transformMiddleware from 'express-transform-bare-module-specifiers';
import * as Sentry from '@sentry/node';
// Ours
import config from './config';
import {SOCKET_MESSAGES} from '../types/socket';
import {HdmiMatrix} from './matricies/hdmi-matrix';
import {ComponentMatrix} from './matricies/component-matrix';
import {COMP_OUT, HDMI_OUT, VIRTUAL_IN, VIRTUAL_OUT} from '../types/matrix-mappings';
import debounce = require('lodash.debounce');
import {
	compInputToVirtualInput,
	hdmiInputToVirtualInput, virtualInputToComponentInput, virtualInputToHdmiInput,
	virtualOutputToComponentOutput,
	virtualOutputToHdmiOutput
} from './conversions';

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
		const output = validateAndClamp(unparsedOutput, Object.keys(VIRTUAL_OUT).length - 1) as VIRTUAL_OUT;
		const input = validateAndClamp(unparsedInput, Object.keys(VIRTUAL_IN).length - 1) as VIRTUAL_IN;
		console.log('SET_OUTPUT | output: %s, input: %s', output, input);

		if (config.get('skipMatricies')) {
			state.outputs[output] = input;
			socket.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);
		} else {
			const routedComponent = componentMatrix.setOutput(
				virtualOutputToComponentOutput(output, input),
				virtualInputToComponentInput(input)
			);

			const routedHDMI = hdmiMatrix.setOutput(
				virtualOutputToHdmiOutput(output),
				virtualInputToHdmiInput(input)
			);

			if (!routedComponent || !routedHDMI) {
				updateState();
			}
		}
	});
});

export async function start() {
	if (config.get('skipMatricies')) {
		return;
	}

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
	// Update Streams
	state.outputs[VIRTUAL_OUT.STREAM_1] = hdmiInputToVirtualInput(hdmiMatrix.state.outputs[HDMI_OUT.STREAM_1]);
	state.outputs[VIRTUAL_OUT.STREAM_2] = hdmiInputToVirtualInput(hdmiMatrix.state.outputs[HDMI_OUT.STREAM_2]);
	state.outputs[VIRTUAL_OUT.STREAM_3] = hdmiInputToVirtualInput(hdmiMatrix.state.outputs[HDMI_OUT.STREAM_3]);
	state.outputs[VIRTUAL_OUT.STREAM_4] = hdmiInputToVirtualInput(hdmiMatrix.state.outputs[HDMI_OUT.STREAM_4]);

	// Update LCDs
	state.outputs[VIRTUAL_OUT.LCD_1] = hdmiInputToVirtualInput(hdmiMatrix.state.outputs[HDMI_OUT.LCD_1]);
	state.outputs[VIRTUAL_OUT.LCD_2] = hdmiInputToVirtualInput(hdmiMatrix.state.outputs[HDMI_OUT.LCD_2]);
	state.outputs[VIRTUAL_OUT.LCD_3] = hdmiInputToVirtualInput(hdmiMatrix.state.outputs[HDMI_OUT.LCD_3]);
	state.outputs[VIRTUAL_OUT.LCD_4] = hdmiInputToVirtualInput(hdmiMatrix.state.outputs[HDMI_OUT.LCD_4]);

	// Update CRTs
	state.outputs[VIRTUAL_OUT.CRT_1] = compInputToVirtualInput(componentMatrix.state.outputs[COMP_OUT.CRT_1]);
	state.outputs[VIRTUAL_OUT.CRT_2] = compInputToVirtualInput(componentMatrix.state.outputs[COMP_OUT.CRT_2]);
	state.outputs[VIRTUAL_OUT.CRT_3] = compInputToVirtualInput(componentMatrix.state.outputs[COMP_OUT.CRT_3]);
	state.outputs[VIRTUAL_OUT.CRT_4] = compInputToVirtualInput(componentMatrix.state.outputs[COMP_OUT.CRT_4]);

	console.log('----------------------------------');
	console.log('hdmiMatrix state:     ', hdmiMatrix.state);
	console.log('componentMatrix state:', componentMatrix.state);
	console.log('app state:            ', state);
	console.log('----------------------------------');
	io.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, state.outputs);
}
