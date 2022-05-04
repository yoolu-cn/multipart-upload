import Axios from 'axios';

interface AxiosOptions {
    onError?: (e: Error) => Error;
    host: string
}

const loop = ((e: any) => e);

export function createAxios(options: AxiosOptions) {
    const { onError: responseErrorHandler = loop, host } = options;
    const instance = Axios.create({
        baseURL: host,
        withCredentials: true,
    });
    instance.interceptors.response.use(
        (response) => response.data,
        responseErrorHandler,
    );

    return instance;
}