import { createAxios } from "../helper/fetch";
export const enum Status {
    wait,
    pause,
    uploading,
    success
}

interface CommonRes {
    success: boolean;
    message: string;
}
interface SearchRes extends CommonRes{
    data?: { 
        hash: string; 
        name: string; 
        status: Status
        id: string;
        chunkHash?: string[]
    }
}

interface IdRes extends CommonRes {
    data: {
        id: string;
        status: Status;
    }
}

export interface UploadRes extends CommonRes {
    data: string;
}


const host = `${location.origin}/api/upload`;

const axios = createAxios({ host });

export function search(params: { hash: string; name: string, size: number, type: string }): Promise<SearchRes> {
    return axios.get('/search', {
        params,
    })
}

export function getId(params: { hash: string; name: string, size: number, type: string }): Promise<IdRes> {
    return axios.get('/id', {
        params,
    })
}

export async function uploadChunk(data: FormData, options: any, fn: any): Promise<UploadRes> {
    return (axios.post(`/file`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        ...options
    }) as Promise<UploadRes>).then((res) => {
        const { success } = res;
        fn(success ? 'success' : 'exception');
        return res;
    })
}

export async function result(id: string) {
    return axios.get('/result', {
        params: { id },
    })
}