/// <reference path="../../types/serialport--bindings.d.ts" />
/// <reference path="../../types/serialport--parser-readline.d.ts" />
/// <reference path="../../types/serialport--parser-byte-length.d.ts" />
/// <reference path="../../types/serialport--stream.d.ts" />

// Native
import {EventEmitter} from 'events';

// Packages
import * as SerialPort from '@serialport/stream';
import * as Readline from '@serialport/parser-readline';
import * as ByteLength from '@serialport/parser-byte-length';
import * as Binding from '@serialport/bindings';
import debounce = require('lodash.debounce');

// Ours
import {SOCKET_MESSAGES} from '../../types/socket';

export interface AbstractMatrixState {
	outputs: AbstractMatrixState.Outputs;
}

export namespace AbstractMatrixState { // tslint:disable-line:no-namespace
	export type Outputs = number[];
}

if (process.env.NODE_ENV !== 'test') {
	SerialPort.Binding = Binding;
}

export abstract class AbstractMatrix extends EventEmitter {
	abstract name: string;

	// Serial connection
	abstract serialPortPath: string;
	abstract baudRate: number;
	dataBits = 8;
	stopBits = 1;
	parity = 'none';
	serialport: any; // No typedefs for @serialport packages yet :/
	parser: any; // No typedefs for @serialport packages yet :/

	// Serial protocol
	abstract fullUpdateTriggers: RegExp[] | null;
	abstract fullUpdateRequest: string | null;
	abstract fullUpdateResponse: RegExp | null;
	delimiter = '\r\n';
	byteLength: number;

	// Physical properties
	numInputs = 8;
	numOutputs = 8;

	state: AbstractMatrixState;

	private _debouncedRequestFullUpdate?: Function;

	abstract processFullUpdate(data: string): AbstractMatrixState.Outputs;
	abstract setOutput(output: number, input: number): void;

	requestFullUpdate() {
		if (!this.fullUpdateRequest) {
			return;
		}

		if (!this._debouncedRequestFullUpdate) {
			this._debouncedRequestFullUpdate = debounce(() => {
				console.log(`${this.name} | request full update!!!`);
				this.serialport.write(this.fullUpdateRequest + this.delimiter);
			}, 35);
		}
		return this._debouncedRequestFullUpdate();
	}

	protected init() {
		// Initialize state.
		this.state = {
			outputs: []
		};
		for (let i = 0; i < this.numOutputs; i++) {
			this.state.outputs[i] = i % this.numInputs;
		}

		// Create serialport.
		const serialport = new SerialPort(this.serialPortPath, {
			baudRate: this.baudRate,
			dataBits: this.dataBits,
			stopBits: this.stopBits,
			parity: this.parity
		});

		// Create parser.
		// If this.byteLength is defined, use a ByteLength parser.
		// Else, use a Readline parser.
		const parser = serialport.pipe(
			this.byteLength ?
				new ByteLength({length: this.byteLength}) :
				new Readline({delimiter: this.delimiter})
		);

		this.serialport = serialport;
		this.parser = parser;

		serialport.on('open', async () => {
			console.log(`${this.name} | serialport open, requesting status`);
			this.requestFullUpdate();
		});

		serialport.on('error', (error: Error) => {
			console.error(`${this.name} | serialport error:`, error);
		});

		serialport.on('close', (error: Error) => {
			console.error(`${this.name} | serialport closed:`, error ? error : 'no error');
		});

		/* tslint:disable:brace-style */
		parser.on('data', (unparsedData: any) => {
			const data = typeof unparsedData === 'string' ?
				unparsedData :
				unparsedData.toString();

			console.log(`${this.name} | serialport data:`, data);

			// If the command is a full update...
			if (this.fullUpdateResponse && this.fullUpdateResponse.test(data)) {
				this.state.outputs = this.processFullUpdate(data);
				this.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, this.state.outputs);
			}

			// Else if the command is one that means we should request a full update...
			else if (this.fullUpdateTriggers && this.fullUpdateTriggers.some(trigger => trigger.test(data))) {
				this.requestFullUpdate();
			}
		});
		/* tslint:enable:brace-style */
	}
}
