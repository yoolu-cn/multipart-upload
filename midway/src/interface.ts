export const enum Status {
  wait,
  pause,
  uploading,
  success,
}

export interface FileMapOptions {
  uploadId: string;
  type: string;
  size: string;
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

export type IGetFileIdResponse = SuccessResponse | ErrorResponse;

export type IPostFileResponse =
  | ErrorResponse
  | {
      data: string;
    };
