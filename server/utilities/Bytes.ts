
export const readableBytes = (bytes: number) => {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    // Display in GB if greater than 1024
    // if (mb > 1024) {
    //     return `${(mb/1024).toFixed(2)} GB`;
    // }
    return `${mb.toFixed(2)} MB`;
}