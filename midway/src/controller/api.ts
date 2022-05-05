import {
  Inject,
  Controller,
  Get,
  Post,
  Query,
  Files,
  Fields,
} from '@midwayjs/decorator';
import { Context } from 'egg';
import path = require('path');
import {
  IGetFileIdResponse,
  IGetFileResponse,
  IPostFileResponse,
  Status,
} from '../interface';
import { UploadService } from '../service/upload';
const fse = require('fs-extra');

const UPLOAD_DIR = path.resolve(__dirname, '../../', 'staticFiles'); // 大文件存储目录
const UPLOAD_CHUNK_DIR = path.resolve(__dirname, '../../', 'chunkFiles'); // 大文件分片数据存储目录
const extractExt = (fileName: string) =>
  fileName.slice(fileName.lastIndexOf('.'), fileName.length);

@Controller('/api/upload')
export class APIController {
  @Inject()
  ctx: Context;

  @Inject()
  uploadService: UploadService;

  @Get('/search')
  async getFile(
    @Query()
    queryData: {
      hash: string;
      name: string;
      size: string;
      type: string;
    }
  ): Promise<IGetFileResponse> {
    const { hash, name, size, type } = queryData;
    if (!hash || !name || !size || !type) {
      return { success: false, message: 'Query Error' };
    }

    const file = await this.uploadService.searchFile({
      hash,
      name,
      size,
      type,
    });
    if (file) {
      return {
        success: true,
        message: 'OK',
        data: {
          hash,
          name,
          status: file.status,
          chunkHash: file.status !== Status.success ? file.chunkHash : [],
          id: file.uploadId,
        },
      };
    }
    return {
      success: true,
      message: 'not found',
      data: { hash, name },
    };
  }

  @Get('/id')
  async getId(
    @Query()
    queryData: {
      hash: string;
      name: string;
      size: string;
      type: string;
    }
  ): Promise<IGetFileIdResponse> {
    const { hash, name, size, type } = queryData;
    if (!hash || !name || !size || !type) {
      return { success: false, message: 'Query Error' };
    }
    const uploadId = await this.uploadService.createFileId({
      hash,
      name,
      size,
      type,
    });

    const chunkFileDir = path.resolve(UPLOAD_CHUNK_DIR, uploadId);

    // 切片目录不存在，创建切片目录
    if (!fse.existsSync(chunkFileDir)) {
      await fse.mkdirs(chunkFileDir);
    }

    return { success: true, message: 'ok', data: { id: uploadId } };
  }

  @Post('/file')
  async file(
    @Files() files: any,
    @Fields() fields: any
  ): Promise<IPostFileResponse> {
    const { hash, id } = fields;
    if (!hash || !id) {
      return { success: false, message: 'Query Error', data: hash };
    }

    await this.uploadService.uploading(id);

    const chunkFileDir = path.resolve(UPLOAD_CHUNK_DIR, id);
    const filePath = path.resolve(chunkFileDir, hash);
    // 文件存在直接返回
    if (fse.existsSync(filePath)) {
      return { success: true, message: 'ok exit', data: hash };
    }

    // 切片目录不存在，创建切片目录
    if (!fse.existsSync(chunkFileDir)) {
      await fse.mkdirs(chunkFileDir);
    }

    const [file] = files;
    await fse.move(file.data, path.resolve(chunkFileDir, hash));
    const res = await this.uploadService.updateFile(id, hash);

    if (!res) {
      return { success: false, message: 'not found', data: hash };
    }
    return { success: true, message: 'ok', data: hash };
  }

  @Get('/result')
  async result(
    @Query('id')
    id: string
  ): Promise<IGetFileIdResponse> {
    if (!id) {
      return { success: false, message: 'Query Error' };
    }
    const file = await this.uploadService.getFile(id);
    if (!file) {
      return {
        success: false,
        message: '暂无上传此文件',
      };
    }
    const { name } = file;
    const ext = extractExt(name);
    const filePath = path.resolve(UPLOAD_DIR, `${id}${ext}`);

    // 切片目录不存在，创建切片目录
    if (!fse.existsSync(UPLOAD_DIR)) {
      await fse.mkdirs(UPLOAD_DIR);
    }

    await this.mergeFileChunk(filePath, id);

    const successFile = await this.uploadService.finish(id);
    return { success: true, message: 'ok', data: successFile };
  }

  async mergeFileChunk(filePath, id) {
    const chunkFileDir = path.resolve(UPLOAD_CHUNK_DIR, id);
    const chunkPaths = await fse.readdir(chunkFileDir);
    // 根据切片下标进行排序
    // 否则直接读取目录的获得的顺序可能会错乱
    chunkPaths.sort((a, b) => a.split('-')[1] - b.split('-')[1]);
    await Promise.all(
      chunkPaths.map((chunkPath, index) =>
        this.pipeStream(
          path.resolve(chunkFileDir, chunkPath),
          // 指定位置创建可写流
          fse.createWriteStream(filePath, {
            start: index * 1024 * 1024,
            end: (index + 1) * 1024 * 1024,
          })
        )
      )
    );
    fse.rmdirSync(chunkFileDir); // 合并后删除保存切片的目录
  }

  pipeStream(path, writeStream) {
    return new Promise(resolve => {
      const readStream = fse.createReadStream(path);
      readStream.on('end', () => {
        fse.unlinkSync(path);
        resolve(true);
      });
      readStream.pipe(writeStream);
    });
  }
}
