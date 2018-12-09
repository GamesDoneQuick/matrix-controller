/// <reference path="../types/serialport--binding-mock.d.ts" />
/// <reference path="../types/serialport--stream.d.ts" />

const MOCK_SERIAL_PATH = '/dev/AVA';
process.env.SERIAL_PATH = MOCK_SERIAL_PATH;

// Packages
import * as SerialPort from '@serialport/stream';
import * as MockBinding from '@serialport/binding-mock';
import * as SocketIOClient from 'socket.io-client';

// Ours
import config from '../src/config';
import {SOCKET_MESSAGES} from '../types/socket';

SerialPort.Binding = MockBinding;
MockBinding.createPort(MOCK_SERIAL_PATH, {echo: false, record: true});

// Import the library under test once our mocks are set up.
import {serialport, stop} from '../src';

let clientSocket: SocketIOClient.Socket;

beforeAll(done => {
	clientSocket = SocketIOClient(`http://localhost:${config.get('port')}`); // tslint:disable-line:no-http-string
	serialport.on('open', () => {
		process.nextTick(() => {
			done();
		});
	});
});

afterEach(() => {
	serialport.write('\r\n');
});

test('requests full update when the serialport opens', () => {
	expect(serialport.binding.lastWrite.toString()).toBe('>@R8006\r\n');
});

test('requests full update when a WVSO confirmation is received', () => {
	serialport.binding.emitData('<@WVSO[01]I[02]\r\n');
	expect(serialport.binding.lastWrite.toString()).toBe('>@R8006\r\n');
});

test('emits socket updates when an OUT CHANGE SET is received via serial', done => {
	clientSocket.once(SOCKET_MESSAGES.OUTPUT_STATUSES, (data: any) => {
		expect(data).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
		done();
	});

	serialport.binding.emitData('OUT CHANGE SET[01][02][03][04][05][06][07][08]\r\n');
});

test('responds to GET_OUTPUTS with OUTPUT_STATUSES', done => {
	clientSocket.once(SOCKET_MESSAGES.OUTPUT_STATUSES, (data: any) => {
		expect(data).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
		done();
	});

	clientSocket.emit(SOCKET_MESSAGES.GET_OUTPUTS);
});

test('writes the correct serial command when SET_OUTPUT is invoked', done => {
	clientSocket.emit(SOCKET_MESSAGES.SET_OUTPUT, 0, 7);
	setTimeout(() => {
		expect(serialport.binding.lastWrite.toString()).toBe('>@WVSO[01]I[08]\r\n');
		done();
	}, 50);
});

afterAll(done => {
	clientSocket.close();
	stop(done);
});
