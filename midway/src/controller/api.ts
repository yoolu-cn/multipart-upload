import { Inject, Controller, Get, Query } from '@midwayjs/decorator';
import { Context } from 'egg';
import { IGetFileResponse, Status } from '../interface';
import { UploadService } from '../service/upload';

@Controller('/api/upload')
export class APIController {
  @Inject()
  ctx: Context;

  @Inject()
  uploadService: UploadService;

  @Get('/search')
  async getFile(
    @Query() queryData: { hash: string; name: string }
  ): Promise<IGetFileResponse> {
    const { hash, name } = queryData;
    if (!hash || !name) {
      return { success: true, message: 'Error' };
    }

    const file = await this.uploadService.searchFile({ hash, name });
    const { status } = file;
    if (file.status === Status.success) {
      return { success: true, message: 'OK', data: { hash, name, status } };
    }
    return { success: false, message: 'not found', data: { hash, name } };
  }
}
