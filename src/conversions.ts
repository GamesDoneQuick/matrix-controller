import {COMP_IN, COMP_OUT, HDMI_IN, HDMI_OUT, VIRTUAL_IN, VIRTUAL_OUT} from '../types/matrix-mappings';
import {componentMatrix} from './app';

export function compInputToVirtualInput(compInput: COMP_IN): VIRTUAL_IN {
	if (compInput === COMP_IN.COMP_1) {
		return VIRTUAL_IN.COMP_1;
	}
	if (compInput === COMP_IN.COMP_2) {
		return VIRTUAL_IN.COMP_2;
	}
	if (compInput === COMP_IN.COMP_3) {
		return VIRTUAL_IN.COMP_3;
	}
	if (compInput === COMP_IN.COMP_4) {
		return VIRTUAL_IN.COMP_4;
	}
	if (compInput === COMP_IN.SCART_1) {
		return VIRTUAL_IN.SCART_1;
	}
	if (compInput === COMP_IN.SCART_2) {
		return VIRTUAL_IN.SCART_2;
	}
	if (compInput === COMP_IN.SCART_3) {
		return VIRTUAL_IN.SCART_3;
	}
	return VIRTUAL_IN.SCART_4;
}

export function hdmiInputToVirtualInput(hdmiInput: HDMI_IN): VIRTUAL_IN {
	if (hdmiInput === HDMI_IN.OSSC_1) {
		return compInputToVirtualInput(componentMatrix.state.outputs[COMP_OUT.OSSC_1]);
	}
	if (hdmiInput === HDMI_IN.OSSC_2) {
		return compInputToVirtualInput(componentMatrix.state.outputs[COMP_OUT.OSSC_2]);
	}
	if (hdmiInput === HDMI_IN.OSSC_3) {
		return compInputToVirtualInput(componentMatrix.state.outputs[COMP_OUT.OSSC_3]);
	}
	if (hdmiInput === HDMI_IN.OSSC_4) {
		return compInputToVirtualInput(componentMatrix.state.outputs[COMP_OUT.OSSC_4]);
	}
	if (hdmiInput === HDMI_IN.HD_1) {
		return VIRTUAL_IN.HDMI_1;
	}
	if (hdmiInput === HDMI_IN.HD_2) {
		return VIRTUAL_IN.HDMI_2;
	}
	if (hdmiInput === HDMI_IN.HD_3) {
		return VIRTUAL_IN.HDMI_3;
	}
	return VIRTUAL_IN.HDMI_4;
}

export function virtualOutputToHdmiOutput(virtualOutput: VIRTUAL_OUT): HDMI_OUT {
	if (virtualOutput === VIRTUAL_OUT.STREAM_1) {
		return HDMI_OUT.STREAM_1;
	}
	if (virtualOutput === VIRTUAL_OUT.STREAM_2) {
		return HDMI_OUT.STREAM_2;
	}
	if (virtualOutput === VIRTUAL_OUT.STREAM_3) {
		return HDMI_OUT.STREAM_3;
	}
	if (virtualOutput === VIRTUAL_OUT.STREAM_4) {
		return HDMI_OUT.STREAM_4;
	}
	if (virtualOutput === VIRTUAL_OUT.LCD_1) {
		return HDMI_OUT.LCD_1;
	}
	if (virtualOutput === VIRTUAL_OUT.LCD_2) {
		return HDMI_OUT.LCD_2;
	}
	if (virtualOutput === VIRTUAL_OUT.LCD_3) {
		return HDMI_OUT.LCD_3;
	}
	if (virtualOutput === VIRTUAL_OUT.LCD_4) {
		return HDMI_OUT.LCD_4;
	}

	return HDMI_OUT.NULL;
}

export function virtualOutputToComponentOutput(virtualOutput: VIRTUAL_OUT, virtualInput: VIRTUAL_IN): COMP_OUT {
	if (virtualInput === VIRTUAL_IN.SCART_1 || virtualInput === VIRTUAL_IN.COMP_1) {
		return COMP_OUT.OSSC_1;
	}
	if (virtualInput === VIRTUAL_IN.SCART_2 || virtualInput === VIRTUAL_IN.COMP_2) {
		return COMP_OUT.OSSC_2;
	}
	if (virtualInput === VIRTUAL_IN.SCART_3 || virtualInput === VIRTUAL_IN.COMP_3) {
		return COMP_OUT.OSSC_3;
	}
	if (virtualInput === VIRTUAL_IN.SCART_4 || virtualInput === VIRTUAL_IN.COMP_4) {
		return COMP_OUT.OSSC_4;
	}
	if (virtualOutput === VIRTUAL_OUT.CRT_1) {
		return COMP_OUT.CRT_1;
	}
	if (virtualOutput === VIRTUAL_OUT.CRT_2) {
		return COMP_OUT.CRT_2;
	}
	if (virtualOutput === VIRTUAL_OUT.CRT_3) {
		return COMP_OUT.CRT_3;
	}
	if (virtualOutput === VIRTUAL_OUT.CRT_4) {
		return COMP_OUT.CRT_4;
	}

	return COMP_OUT.NULL;
}

export function virtualInputToHdmiInput(virtualInput: VIRTUAL_IN): HDMI_IN {
	if (virtualInput === VIRTUAL_IN.SCART_1 || virtualInput === VIRTUAL_IN.COMP_1) {
		return HDMI_IN.OSSC_1;
	}
	if (virtualInput === VIRTUAL_IN.SCART_2 || virtualInput === VIRTUAL_IN.COMP_2) {
		return HDMI_IN.OSSC_2;
	}
	if (virtualInput === VIRTUAL_IN.SCART_3 || virtualInput === VIRTUAL_IN.COMP_3) {
		return HDMI_IN.OSSC_3;
	}
	if (virtualInput === VIRTUAL_IN.SCART_4 || virtualInput === VIRTUAL_IN.COMP_4) {
		return HDMI_IN.OSSC_4;
	}
	if (virtualInput === VIRTUAL_IN.HDMI_1) {
		return HDMI_IN.HD_1;
	}
	if (virtualInput === VIRTUAL_IN.HDMI_2) {
		return HDMI_IN.HD_2;
	}
	if (virtualInput === VIRTUAL_IN.HDMI_3) {
		return HDMI_IN.HD_3;
	}
	if (virtualInput === VIRTUAL_IN.HDMI_4) {
		return HDMI_IN.HD_4;
	}
	return HDMI_IN.NULL;
}

export function virtualInputToComponentInput(virtualInput: VIRTUAL_IN): COMP_IN {
	if (virtualInput === VIRTUAL_IN.SCART_1) {
		return COMP_IN.SCART_1;
	}
	if (virtualInput === VIRTUAL_IN.SCART_2) {
		return COMP_IN.SCART_2;
	}
	if (virtualInput === VIRTUAL_IN.SCART_3) {
		return COMP_IN.SCART_3;
	}
	if (virtualInput === VIRTUAL_IN.SCART_4) {
		return COMP_IN.SCART_4;
	}
	if (virtualInput === VIRTUAL_IN.COMP_1) {
		return COMP_IN.COMP_1;
	}
	if (virtualInput === VIRTUAL_IN.COMP_2) {
		return COMP_IN.COMP_2;
	}
	if (virtualInput === VIRTUAL_IN.COMP_3) {
		return COMP_IN.COMP_3;
	}
	if (virtualInput === VIRTUAL_IN.COMP_4) {
		return COMP_IN.COMP_4;
	}
	return COMP_IN.NULL;
}
