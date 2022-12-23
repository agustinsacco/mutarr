

export const swapFormat = (fileName: string, format: string): string => {
    const currentFormat = getFileFormat(fileName);
    return fileName.replace(`.${currentFormat}`, `.${format}`)
}

export const getFileName = (path: string): string => {
    const split = path.split('/');
    return split[split.length - 1];
}

export const getFileFormat = (fileName: string): string => {
    const split = fileName.split('.');
    return split[split.length - 1];
}