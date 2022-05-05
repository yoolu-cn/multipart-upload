import { Provide } from '@midwayjs/decorator';
import { FileMapOptions, Status } from '../interface';
const crypto = require('crypto');

const fileMap: Map<string, FileMapOptions> = new Map();

@Provide()
export class UploadService {
  async createFileId(options: {
    hash: string;
    name: string;
    size: string;
    type: string;
  }) {
    const { hash, name, size, type } = options;
    const uploadId = this.createUploadId(hash, name, size, type);
    fileMap.set(uploadId, {
      uploadId,
      type,
      size,
      hash,
      name,
      status: Status.wait,
      chunkHash: [],
    });
    return uploadId;
  }
  async searchFile(options: {
    hash: string;
    size: string;
    type: string;
    name: string;
  }) {
    const { hash, name, size, type } = options;
    const uploadId = this.createUploadId(hash, name, size, type);
    return fileMap.get(uploadId);
  }

  async updateFile(id: string, hash: string) {
    const file = fileMap.get(id);
    if (!file) {
      return false;
    }
    fileMap.set(id, {
      ...file,
      chunkHash: [...file.chunkHash, hash],
    });
    return true;
  }

  createUploadId(hash: string, name: string, size: string, type: string) {
    return crypto
      .createHash('md5')
      .update(`${hash}#${name}#${size}#${type}`)
      .digest('hex');
  }
}
