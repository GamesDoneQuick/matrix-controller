/// <reference path="../types/serialport--binding-mock.d.ts" />
/// <reference path="../types/serialport--stream.d.ts" />

// Packages
import * as SerialPort from '@serialport/stream';
import * as MockBinding from '@serialport/binding-mock';
import * as SocketIOClient from 'socket.io-client';
import * as sinon from 'sinon';
import * as sleep from 'sleep-promise';

// Ours
import config from '../src/config';
import {SOCKET_MESSAGES} from '../types/socket';
import {VIRTUAL_OUT, VIRTUAL_IN, HDMI_OUT, HDMI_IN, COMP_OUT, COMP_IN} from '../types/matrix-mappings';

SerialPort.Binding = MockBinding;
MockBinding.createPort('COM1', {echo: false, record: true});
MockBinding.createPort('COM2', {echo: false, record: true});

// Import the library under test once our mocks are set up.
import {componentMatrix, hdmiMatrix, stop} from '../src/app';

let clientSocket: SocketIOClient.Socket;
jest.setTimeout(10000);

beforeAll(async () => {
	hdmiMatrix.comName = 'COM1';
	componentMatrix.comName = 'COM2';
	await hdmiMatrix.init();
	await componentMatrix.init();
	clientSocket = SocketIOClient(`http://localhost:${config.get('port')}`); // tslint:disable-line:no-http-string
});

test('responds to GET_OUTPUTS with OUTPUT_STATUSES', done => {
	clientSocket.once(SOCKET_MESSAGES.OUTPUT_STATUSES, (data: any) => {
		try {
			expect(data).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
			done();
		} catch (error) {
			done(error);
		}
	});

	clientSocket.emit(SOCKET_MESSAGES.GET_OUTPUTS);
});

test('calls setOutput on the matrix instances when SET_OUTPUT is invoked', async () => {
	/* tslint:disable:no-multi-spaces */
	const testCases = [
		// HDMI output, HDMI input.
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.HDMI_1,  hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.HD_1]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.HDMI_2,  hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.HD_2]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.HDMI_3,  hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.HD_3]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.HDMI_4,  hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.HD_4]},

		// LCD output, HDMI input.
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.HDMI_1,  hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.HD_1]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.HDMI_2,  hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.HD_2]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.HDMI_3,  hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.HD_3]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.HDMI_4,  hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.HD_4]},

		// HDMI output, Component input.
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.COMP_1,  hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.OSSC_1], componentMatrix: [COMP_OUT.OSSC_1, COMP_IN.COMP_1]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.COMP_2,  hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.OSSC_2], componentMatrix: [COMP_OUT.OSSC_2, COMP_IN.COMP_2]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.COMP_3,  hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.OSSC_3], componentMatrix: [COMP_OUT.OSSC_3, COMP_IN.COMP_3]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.COMP_4,  hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.OSSC_4], componentMatrix: [COMP_OUT.OSSC_4, COMP_IN.COMP_4]},

		// CRT, Component input.
		{output: VIRTUAL_OUT.CRT_4,    input: VIRTUAL_IN.COMP_1,  componentMatrix: [COMP_OUT.CRT_4, COMP_IN.COMP_1]},
		{output: VIRTUAL_OUT.CRT_4,    input: VIRTUAL_IN.COMP_2,  componentMatrix: [COMP_OUT.CRT_4, COMP_IN.COMP_2]},
		{output: VIRTUAL_OUT.CRT_4,    input: VIRTUAL_IN.COMP_3,  componentMatrix: [COMP_OUT.CRT_4, COMP_IN.COMP_3]},
		{output: VIRTUAL_OUT.CRT_4,    input: VIRTUAL_IN.COMP_4,  componentMatrix: [COMP_OUT.CRT_4, COMP_IN.COMP_4]},

		// LCD, Component input.
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.COMP_1,  hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.OSSC_1], componentMatrix: [COMP_OUT.OSSC_1, COMP_IN.COMP_1]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.COMP_2,  hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.OSSC_2], componentMatrix: [COMP_OUT.OSSC_2, COMP_IN.COMP_2]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.COMP_3,  hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.OSSC_3], componentMatrix: [COMP_OUT.OSSC_3, COMP_IN.COMP_3]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.COMP_4,  hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.OSSC_4], componentMatrix: [COMP_OUT.OSSC_4, COMP_IN.COMP_4]},

		// HDMI output, SCART input.
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.SCART_1, hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.OSSC_1], componentMatrix: [COMP_OUT.OSSC_1, COMP_IN.SCART_1]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.SCART_2, hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.OSSC_2], componentMatrix: [COMP_OUT.OSSC_2, COMP_IN.SCART_2]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.SCART_3, hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.OSSC_3], componentMatrix: [COMP_OUT.OSSC_3, COMP_IN.SCART_3]},
		{output: VIRTUAL_OUT.STREAM_1, input: VIRTUAL_IN.SCART_4, hdmiMatrix: [HDMI_OUT.STREAM_1, HDMI_IN.OSSC_4], componentMatrix: [COMP_OUT.OSSC_4, COMP_IN.SCART_4]},

		// CRT, SCART input.
		{output: VIRTUAL_OUT.CRT_4,    input: VIRTUAL_IN.SCART_1, componentMatrix: [COMP_OUT.CRT_4, COMP_IN.SCART_1]},
		{output: VIRTUAL_OUT.CRT_4,    input: VIRTUAL_IN.SCART_2, componentMatrix: [COMP_OUT.CRT_4, COMP_IN.SCART_2]},
		{output: VIRTUAL_OUT.CRT_4,    input: VIRTUAL_IN.SCART_3, componentMatrix: [COMP_OUT.CRT_4, COMP_IN.SCART_3]},
		{output: VIRTUAL_OUT.CRT_4,    input: VIRTUAL_IN.SCART_4, componentMatrix: [COMP_OUT.CRT_4, COMP_IN.SCART_4]},

		// LCD output, SCART input.
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.SCART_1, hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.OSSC_1], componentMatrix: [COMP_OUT.OSSC_1, COMP_IN.SCART_1]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.SCART_2, hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.OSSC_2], componentMatrix: [COMP_OUT.OSSC_2, COMP_IN.SCART_2]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.SCART_3, hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.OSSC_3], componentMatrix: [COMP_OUT.OSSC_3, COMP_IN.SCART_3]},
		{output: VIRTUAL_OUT.LCD_4,    input: VIRTUAL_IN.SCART_4, hdmiMatrix: [HDMI_OUT.LCD_4,     HDMI_IN.OSSC_4], componentMatrix: [COMP_OUT.OSSC_4, COMP_IN.SCART_4]}
	] as {
		output: VIRTUAL_OUT;
		input: VIRTUAL_IN;
		hdmiMatrix?: [HDMI_OUT, HDMI_IN];
		componentMatrix?: [COMP_OUT, COMP_IN];
	}[];
	/* tslint:enable:no-multi-spaces */

	// Setup.
	const hdmiStub = sinon.stub(hdmiMatrix, 'setOutput');
	const componentStub = sinon.stub(componentMatrix, 'setOutput');

	for (let i = 0; i < testCases.length; i++) { // tslint:disable-line:prefer-for-of
		const testCase = testCases[i];

		// Reset state.
		hdmiStub.reset();
		componentStub.reset();

		// Test.
		clientSocket.emit(SOCKET_MESSAGES.SET_OUTPUT, testCase.output, testCase.input);
		await sleep(100);

		// Assert.
		if (testCase.hdmiMatrix) {
			expect(hdmiStub.callCount).toBe(1);
			expect(hdmiStub.lastCall.args).toEqual(testCase.hdmiMatrix);
		}
		if (testCase.componentMatrix) {
			expect(componentStub.callCount).toBe(1);
			expect(componentStub.lastCall.args).toEqual(testCase.componentMatrix);
		}
	}

	// Teardown.
	hdmiStub.restore();
	componentStub.restore();
});

afterAll(done => {
	clientSocket.close();
	stop(done);
});
