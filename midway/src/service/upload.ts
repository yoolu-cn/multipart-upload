import { Provide } from '@midwayjs/decorator';
const crypto = require('crypto');

const fileMap = new Map();

@Provide()
export class UploadService {
  async searchFile(options: { hash: string; name: string }) {
    const { hash, name } = options;
    const uploadId = this.createUploadId(hash, name);
    const file = fileMap.get(uploadId);
    return file || {};
  }

  createUploadId(hash: string, name: string) {
    return crypto.createHash('md5').update(`${hash}#${name}`).digest('hex');
  }
}
