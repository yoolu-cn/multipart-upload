<script setup lang="ts">
import { message } from 'ant-design-vue';
import { reactive, ref, unref, computed } from 'vue';
import { ChunkFileItem, CHUNK_SIZE, Container, createFileChunks, createFileHash, MAX_REQUEST, MAX_REXHR, ProgressStatus } from '../helper';
import { cancelToken } from '../helper/fetch';
import { getId, search, Status as StatusOption, uploadChunk, result } from '../service/upload';

const columns = [
    {
        title: '切片hash',
        dataIndex: 'hash',
        key: 'hash',
    },
    {
        title: '大小(B)',
        dataIndex: 'size',
        key: 'size',
    },
    {
        title: '进度',
        dataIndex: 'percent',
        key: 'percent',
    },
];
const status = ref(StatusOption.wait);
let dataSource = ref([] as ChunkFileItem[]);
const hashPercent = ref(0);
const uploadPercent = reactive({ percent: 0, status: 'active' });
const container: Container = reactive({
    file: null,
    hash: '',
    id: '',
    worker: null
});

const fileChange = (e: InputEvent) => {
    resetUpload();
    const [file]:FileList = (e.target as HTMLInputElement).files!;
    if (!file) {
        return;
    }
    console.log('File: ', file)
    container.file = file;
};

/**
 * 上传操作
 */
const upload = async () => {
    const { file } = container;
    if (!file) return;
    status.value = StatusOption.uploading;
    const fileChunks = createFileChunks(file, CHUNK_SIZE);
    console.log('fileChunks', fileChunks)
    container.hash = await createFileHash(container, (percent: number) => {
        hashPercent.value = percent;
    });

    const { size, name, type  } = file;

    const res = await search({ hash: container.hash, size, name, type });
    const { success, message: info, data: { status: searchStatus, id, chunkHash: uploadedList = [] } = {}} = res;
    console.log(res)
    // 接口报错
    if (!success) {
        return message.error(info);
    }
    container.id = id!;
    hashPercent.value = 100;
    status.value = searchStatus as StatusOption;
    switch(searchStatus) {
        case StatusOption.success:
            updateTableSource(fileChunks, [], true);
            uploadPercent.status = 'success';
            message.success('上传成功');
            break;
        case StatusOption.uploading:
        case StatusOption.pause:
            beforeUpload(fileChunks, uploadedList);
            break;
        default: 
            const { data: { id } } = await getId({ hash: container.hash, size, name, type });
            container.id = id;
            beforeUpload(fileChunks, uploadedList);
            break;
    }
}

const updateTableSource = (fileChunks: Array<{ file: Blob }>, uploadedList: string[], uploaded: boolean) => {
    dataSource.value = fileChunks.map((item: { file: Blob }, index: number):ChunkFileItem => {
        const hash = container.hash + '-' + index;
        const success = uploaded || uploadedList.includes(hash);
        return reactive({
            index,
            fileHash: container.hash,
            hash,
            chunk: item.file,
            size: item.file.size,
            percent: success ? 100 : 0,
            status: success ? 'success' : 'active',
            cancelToken: success ? null : cancelToken.source()
        })
    });
    console.log(unref(dataSource.value));
}

const beforeUpload = async (fileChunks: Array<{ file: Blob }>, uploadedList: string[]) => {
    updateTableSource(fileChunks, uploadedList, false);
    await uploadChunks(uploadedList);

    if (uploadPercent.status === 'success') {
        await result(container.id);
        message.success('上传成功');
    } else {
        message.success('上传失败');
    }
}

const pause = async () => {
    status.value = StatusOption.pause;
}

/**
 * 分片上传操作
 * @param uploadedList 已上传的数据，用于断电续传
 */
const uploadChunks = async (uploadedList: string[]) => {
    console.log(uploadedList);
    const errorRequest = new Map();
    const requestList = unref(dataSource)
        .filter((item: ChunkFileItem, index: number) => !uploadedList.includes(item.hash));
    console.log(requestList, uploadedList)
    let requestDone = false;
    let start: number = 0;
    while(!requestDone) {
        if (status.value === StatusOption.pause) {
            uploadPercent.status = 'exception';
            requestDone = true;
            break;
        }
        const promises: any[] = []
        if (start < requestList.length) {
            createPromise(promises, requestList.slice(start, start + MAX_REQUEST))
            start += promises.length;
        } else {
            const hashs = [...errorRequest.keys()];
            createPromise(promises, requestList.filter((item: ChunkFileItem) => hashs.includes(item.hash)));
        }
        const res = await Promise.allSettled(promises);
        res.forEach(({ value }: any) => {
            const hasMap = errorRequest.has(value.data);
            if (value.success) {
                hasMap && errorRequest.delete(value.data);
            } else {
                errorRequest.set(value.data, hasMap ? (errorRequest.get(value.data) + 1) : 1);
            }
        });
        /**
         * 如果有接口重试超过3次 结束上传操作
         */
        const errorTimes = [...errorRequest.values()].find((i: number) => i === MAX_REXHR);
        if (errorTimes) {
            uploadPercent.status = 'exception';
            requestDone = true;
            break;
        }
        
        /**
         * 上传完 requestList 并且重试错误请求并成功后 才算真正的上传完成分片
         */
        if (start >= requestList.length && ![...errorRequest.keys()].length) {
            requestDone = true;
            uploadPercent.status = 'success';
            break;
        }
    }
}

/**
 * 计算总进度
 */
const uploadPercentOne = computed(() => {
    if (!dataSource.value.length) return 0;
    const loaded = dataSource.value.filter((item: ChunkFileItem) => {
        return item.status === 'success'
    });
    return Number((loaded.length / dataSource.value.length * 100).toFixed(2));
})
/**
 * 利用闭包数据 同步修改接口进度
 * @param item 分片数据
 */
const createProgressHandler = (item: ChunkFileItem) => {
    return (e: ProgressEvent) => {
        if (status.value === StatusOption.pause) {
            item.cancelToken.cancel('取消长传');
            item.cancelToken = cancelToken.source();
        } else {
            item.percent = parseInt(String((e.loaded / e.total) * 100));
        }
    }
}
/**
 * 运用闭包特性 接口返回时同步当前分片状态
 * @param item 分片数据
 */
const updateChunkStatus = (item: ChunkFileItem) => {
    return (status: ProgressStatus) => {
        item.status = status;
    }
}

/**
 * 重置上传组件
 */
const resetUpload = () => {
    status.value = StatusOption.wait;
    dataSource.value = [];
    hashPercent.value = 0;
    uploadPercent.percent = 0
    uploadPercent.status = 'active';
    container.file = null;
    container.hash = '';
    container.id = '';
    container.worker = null;
}

/**
 * 批量生成请求列表
 * @param promises 
 * @param list 
 */
const createPromise = (promises: any[], list: any[]) => {
    list.forEach((item: ChunkFileItem) => {
        const formData = new FormData();
        formData.append('id', container.id);
        formData.append('hash', item.hash);
        formData.append('file', item.chunk);
        promises.push(
            uploadChunk(formData, {
                onUploadProgress: createProgressHandler(item),
                cancelToken: item.cancelToken.token
            }, updateChunkStatus(item))
        );
    })
}

</script>

<template>
    <div class="flex flex-row px-10 pt-10">
        <a-input type="file" class="w-1/4 mr-4" placeholder="上传文件" @change="fileChange" />
        <a-button
            type="primary"
            :disabled="StatusOption.uploading === status"
            class="mr-4"
            @click="upload"
        >
            上传
        </a-button>
        <a-button
            v-if="StatusOption.pause !== status"
            :disabled="StatusOption.wait === status"
            type="primary"
            danger
            class="mr-4"
            @click="pause"
        >
            暂停
        </a-button>
        <a-button v-else type="primary" danger class="mr-4" @click="status = StatusOption.uploading"
            >恢复</a-button
        >
    </div>
    <div class="flex flex-col p-10">
        <p class="text-left">计算文件hash</p>
        <a-progress :percent="hashPercent" :status="hashPercent === 100 ? 'success' : 'active'" />
        <p class="text-left">总进度</p>
        <a-progress :percent="uploadPercentOne" :status="uploadPercent.status" />
    </div>
    <a-table :dataSource="dataSource" :columns="columns" class="px-10">
        <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'percent'">
                <a-progress :percent="record.percent" size="small" :status="record.status" />
            </template>
        </template>
    </a-table>
</template>
