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
		/^<@WVSO/,
		/^==================================$/
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

	setOutput(output: number, input: number) {
		return this.serialport.write(`>@WVSO[0${output + 1}]I[0${input + 1}]${this.delimiter}`);
	}
}
