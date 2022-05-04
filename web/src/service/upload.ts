import { createAxios } from "../helper/fetch";

const host = `${location.origin}/api/upload`;

const axios = createAxios({ host });

export function search(params: { hash?: string; name?: string, size?: number, type?: string }) {
    return axios.get('/search', {
        params,
    })
}