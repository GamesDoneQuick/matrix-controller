/// <reference path="../types/serialport--binding-mock.d.ts" />
/// <reference path="../types/serialport--stream.d.ts" />

const MOCK_HDMI_SERIAL_PATH = '/dev/AVA1';
const MOCK_COMP_SERIAL_PATH = '/dev/AVA2';
process.env.HDMI_SERIAL_PATH = MOCK_HDMI_SERIAL_PATH;
process.env.COMPONENT_SERIAL_PATH = MOCK_HDMI_SERIAL_PATH;

// Packages
import * as sleep from 'sleep-promise';
import * as SerialPort from '@serialport/stream';
import * as MockBinding from '@serialport/binding-mock';

// Ours
import {HdmiMatrix} from '../src/matricies/hdmi-matrix';
import {SOCKET_MESSAGES} from '../types/socket';

SerialPort.Binding = MockBinding;
MockBinding.createPort(MOCK_HDMI_SERIAL_PATH, {echo: false, record: true});
MockBinding.createPort(MOCK_COMP_SERIAL_PATH, {echo: false, record: true});

const hdmiMatrix = new HdmiMatrix();

beforeAll(done => {
	hdmiMatrix.serialport.on('open', () => {
		process.nextTick(() => {
			done();
		});
	});
});

afterEach(() => {
	hdmiMatrix.serialport.write(hdmiMatrix.delimiter);
});

test('requests full update when the serialport opens', async () => {
	await sleep(100);
	expect(hdmiMatrix.serialport.binding.lastWrite.toString()).toBe('>@R8006\r\n');
});

test('requests full update after receiving the startup sequence', async () => {
	hdmiMatrix.serialport.binding.emitData('==================================\r\n');
	hdmiMatrix.serialport.binding.emitData('V1.0\r\n');
	hdmiMatrix.serialport.binding.emitData('Data:Jan 16 2016\r\n');
	hdmiMatrix.serialport.binding.emitData('Time:15:39:34\r\n');
	hdmiMatrix.serialport.binding.emitData('==================================\r\n');
	await sleep(100);
	expect(hdmiMatrix.serialport.binding.lastWrite.toString()).toBe('>@R8006\r\n');
});

test('requests full update when a WVSO confirmation is received', () => {
	hdmiMatrix.serialport.binding.emitData('<@WVSO[01]I[02]\r\n');
	expect(hdmiMatrix.serialport.binding.lastWrite.toString()).toBe('>@R8006\r\n');
});

test('emits socket updates when an OUT CHANGE SET is received via serial', done => {
	hdmiMatrix.once(SOCKET_MESSAGES.OUTPUT_STATUSES, (data: any) => {
		expect(data).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
		done();
	});

	hdmiMatrix.serialport.binding.emitData('OUT CHANGE SET[01][02][03][04][05][06][07][08]\r\n');
});

test('writes the correct serial command when setOutput is called', async () => {
	await sleep(100);
	hdmiMatrix.setOutput(0, 7);
	await sleep(100);
	expect(hdmiMatrix.serialport.binding.lastWrite.toString()).toBe('>@WVSO[01]I[08]\r\n');
});
