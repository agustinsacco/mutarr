
export const bytesToReadable = (bytes: number): string => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    // Display in GB if greater than 1024
    if (mb > 1024) {
        return `${(mb/1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
}

export const readableToBytes = (size: string): number => {
    if (size.includes('GB')) {
        // Remove GB
        const gb: number = +(size.replace('GB', '').trim());
        return gb * 1024 * 1024 * 1024;
    } else if (size.includes('MB')) {
        // Remove BB
        const mb: number = +(size.replace('MB', '').trim());
        return mb * 1024 * 1024;
    }
}