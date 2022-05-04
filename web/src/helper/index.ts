export const transformByte = (val: number): number => {
    return Number((val / 1024).toFixed(0));
};

export interface Container {
    file: File | null;
    hash: string;
    worker: Worker | null;
}

export const CHUNK_SIZE = 1 * 1024 * 1024;
export const HASH_CHUNK_SIZE = 20 * 1024 * 1024;

/**
 * 对文件进行分片
 * @param file 文件
 * @param size 分片大小
 * @returns 
 */
export function createFileChunks(file: File, size: number): Array<{ file: Blob }> {
    const fileChunks = [];

    let curSize = 0;
    while(curSize < file.size) {
        fileChunks.push({ file: file.slice(curSize, curSize + size) });
        curSize += size
    }

    return fileChunks;
}

/**
 * 根据文件分片计算文件hash
 * @param container 
 * @param fn 
 * @returns 
 */
export function createFileHash(container: Container, fn: (percentage: number) => void): Promise<string> {
    const fileChunks = createFileChunks(container.file!, HASH_CHUNK_SIZE);
    console.timeLog('chunk');
    return new Promise((resolve, reject) => {
        try {
            container.worker = new Worker('./src/hash.ts');
            container.worker.postMessage({ fileChunks });
            container.worker.onmessage = (e) => {
                const { percentage, hash } = e.data;
                fn(percentage);
                if (hash) {
                    resolve(hash);
                }
            };
        } catch (e) {
            reject(e);
        }
    })

}