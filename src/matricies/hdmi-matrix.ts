// Ours
import {AbstractMatrix} from './abstract-matrix';
import config from '../config';

const OUTPUT_REGEX = /\d{2}/g;

export class HdmiMatrix extends AbstractMatrix {
	name = 'HDMI';

	// Serial connection
	serialPortPath = config.get('hdmiSerialPath');
	baudRate = 57600;

	// Serial protocol
	fullUpdateTriggers = [
		/^<@WVSO/, // When the user changes something via the front panel.
		/^==================================$/ // When the unit powers up.
	];
	fullUpdateRequest = '>@R8006';
	fullUpdateResponse = /^OUT CHANGE SET/;

	constructor() {
		super();
		this.init();
	}

	processFullUpdate(data: string) {
		const matches = data.match(OUTPUT_REGEX);
		if (matches) {
			return matches.map(match => {
				return parseInt(match, 10) - 1;
			});
		}

		return this.state.outputs;
	}

	protected _buildSetOutputCommand(output: number, input: number) {
		return `>@WVSO[0${output + 1}]I[0${input + 1}]${this.delimiter}`;
	}
}
