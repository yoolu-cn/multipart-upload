<script setup lang="ts">
import { InputSearch } from 'ant-design-vue';
import { reactive, ref } from 'vue';
import { CHUNK_SIZE, Container, createFileChunks, createFileHash } from '../helper';
import { search } from '../service/upload';
const Status = {
    wait: 'wait',
    pause: 'pause',
    uploading: 'uploading',
};
const columns = [
    {
        title: '切片hash',
        dataIndex: 'hash',
        key: 'hash',
    },
    {
        title: '大小(KB)',
        dataIndex: 'size',
        key: 'size',
    },
    {
        title: '进度',
        dataIndex: 'percent',
        key: 'percent',
    },
];
let status = ref(Status.wait);
const dataSource = ref([]);
const hashPercent = ref(0);
const uploadPercent = ref(0);
const container: Container = reactive({
    file: null,
    hash: '',
    worker: null
});



const fileChange = (e: InputEvent) => {
    const [file]:FileList = (e.target as HTMLInputElement).files!;
    if (!file) {
        return;
    }
    console.log('File: ', file)
    container.file = file;
};

const upload = async () => {
    const { file } = container;
    if (!file) return;
    status.value = Status.uploading;
    console.log(status);;
    const fileChunks = createFileChunks(file, CHUNK_SIZE);
    container.hash = await createFileHash(container, (percent: number) => {
        hashPercent.value = percent;
    });

    const { size, name, type  } = file;

    const res = search({ hash: container.hash, size, name, type });

}


</script>

<template>
    <div class="flex flex-row px-10 pt-10">
        <a-input type="file" class="w-1/4 mr-4" placeholder="上传文件" @change="fileChange" />
        <a-button
            type="primary"
            :disabled="Status.uploading === status"
            class="mr-4"
            @click="upload"
        >
            上传
        </a-button>
        <a-button
            v-if="Status.pause !== status"
            :disabled="Status.wait === status"
            type="primary"
            danger
            class="mr-4"
            @click="status = Status.pause"
        >
            暂停
        </a-button>
        <a-button v-else type="primary" danger class="mr-4" @click="status = Status.uploading"
            >恢复</a-button
        >
    </div>
    <div class="flex flex-col p-10">
        <p class="text-left">计算文件hash</p>
        <a-progress :percent="hashPercent" :status="hashPercent === 100 ? 'success' : 'active'" />
        <p class="text-left">总进度</p>
        <a-progress :percent="uploadPercent" :status="uploadPercent === 100 ? 'success' : 'active'" />
    </div>
    <a-table :dataSource="dataSource" :columns="columns" class="px-10">
        <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'percent'">
                <a-progress :percent="record.percent" size="small" :status="record.percent === 100 ? 'success' : 'active'" />
            </template>
        </template>
    </a-table>
</template>
