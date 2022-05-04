export const enum Status {
  wiat,
  uploading,
  success,
}

export interface FileMapOptions {
  uploadId: string;
  hash: string;
  name: string;
  status: Status;
  chunkHash: string[];
}

export interface ErrorResponse {
  success: boolean;
  message: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
  data: any;
}

export type IGetFileResponse = SuccessResponse | ErrorResponse;
