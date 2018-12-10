/// <reference path="../types/serialport--binding-mock.d.ts" />
/// <reference path="../types/serialport--stream.d.ts" />

const MOCK_SERIAL_PATH = '/dev/AVA';
process.env.SERIAL_PATH = MOCK_SERIAL_PATH;

// Packages
import * as SerialPort from '@serialport/stream';
import * as MockBinding from '@serialport/binding-mock';
import * as SocketIOClient from 'socket.io-client';
import * as sinon from 'sinon';
import * as sleep from 'sleep-promise';

// Ours
import config from '../src/config';
import {SOCKET_MESSAGES} from '../types/socket';

SerialPort.Binding = MockBinding;
MockBinding.createPort(MOCK_SERIAL_PATH, {echo: false, record: true});

// Import the library under test once our mocks are set up.
import {hdmiMatrix, stop} from '../src';

let clientSocket: SocketIOClient.Socket;

beforeAll(() => {
	clientSocket = SocketIOClient(`http://localhost:${config.get('port')}`); // tslint:disable-line:no-http-string
});

test('responds to GET_OUTPUTS with OUTPUT_STATUSES', done => {
	clientSocket.once(SOCKET_MESSAGES.OUTPUT_STATUSES, (data: any) => {
		expect(data).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
		done();
	});

	clientSocket.emit(SOCKET_MESSAGES.GET_OUTPUTS);
});

test('calls setOutput on the matrix instances when SET_OUTPUT is invoked', async () => {
	const stub = sinon.stub(hdmiMatrix, 'setOutput');
	clientSocket.emit(SOCKET_MESSAGES.SET_OUTPUT, 0, 7);
	await sleep(100);
	expect(stub.callCount).toBe(1);
	expect(stub.lastCall.args).toEqual([0, 7]);
	stub.restore();
});

afterAll(done => {
	clientSocket.close();
	stop(done);
});
