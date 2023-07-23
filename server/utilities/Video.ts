import { getFileFormat } from "./File";

export const supportedFormats = ['mp4', 'avi', 'mkv', 'mov'];

export const isFileSupported = (file : string) => {
    const format = getFileFormat(file);
    return supportedFormats.includes(format);
}