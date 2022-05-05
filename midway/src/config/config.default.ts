import { MidwayConfig, MidwayAppInfo } from '@midwayjs/core';
import { join } from 'path';
// import { uploadWhiteList } from '@midwayjs/upload';

export default (appInfo: MidwayAppInfo) => {
  return {
    // use for cookie sign key, should change to your own and keep security
    keys: appInfo.name + '_1651415849609_383',
    egg: {
      port: 7001,
    },
    upload: {
      // mode: UploadMode, 默认为file，即上传到服务器临时目录，可以配置为 stream
      mode: 'file',
      // fileSize: string, 最大上传文件大小，默认为 10mb
      fileSize: '10mb',
      // whitelist: string[]，文件扩展名白名单
      whitelist: null,
      // tmpdir: string，上传的文件临时存储路径
      tmpdir: join(__dirname, '../../midway-upload-files'),
      // cleanTimeout: number，上传的文件在临时目录中多久之后自动删除，默认为 5 分钟
      cleanTimeout: 5 * 60 * 1000,
    },
    // security: {
    //   csrf: false,
    // },
  } as MidwayConfig;
};
