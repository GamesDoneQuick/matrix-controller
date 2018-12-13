// Ours
import {AbstractMatrix} from './abstract-matrix';
import config from '../config';
import {SOCKET_MESSAGES} from '../../types/socket';

const ACK_REGEX = /SBUD\d(\d)O(\d)/;

export class ComponentMatrix extends AbstractMatrix {
	name = 'Component';

	// Serial connection
	serialPortPath = config.get('componentSerialPath');
	baudRate = 9600;
	byteLength = 8;

	// Serial protocol
	fullUpdateTriggers = null;
	fullUpdateRequest = null;
	fullUpdateResponse = null;
	delimiter = '';

	constructor() {
		super();
		this.init();

		this.serialport.on('open', async () => {
			// Reset the matrix to a known state.
			this._addCommandToQueue('SBALLRST');

			// Lock the front panel so only we can control it via serial.
			this._addCommandToQueue('SBSYSMLK');
		});

		this.parser.on('data', (data: string) => {
			const str = data.toString();
			const matches = str.match(ACK_REGEX);
			if (matches) {
				const output = parseInt(matches[2], 10) - 1;
				const input = parseInt(matches[1], 10) - 1;
				this.state.outputs[output] = input;
				this.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, this.state.outputs);
			} else if (str === 'SBRSTACK') {
				this.state.outputs = [0, 0, 0, 0, 0, 0, 0, 0];
				this.emit(SOCKET_MESSAGES.OUTPUT_STATUSES, this.state.outputs);
			}
		});
	}

	processFullUpdate(_data: string) {
		return this.state.outputs;
	}

	protected _buildSetOutputCommand(output: number, input: number) {
		return `SBI0${input + 1}O0${output + 1}`;
	}
}
