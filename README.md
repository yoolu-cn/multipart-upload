# 分片上传重构

## node 端采用 midway 框架
## web 端采用 vite + vue3 + ts 

## 整体思路

---

### 前端

前端大文件上传核心是利用 `[Blob.slice([start[, end[, contentType]]])](https://developer.mozilla.org/zh-CN/docs/Web/API/Blob/slice)` 方法，返回一个新的 `Blob` 对象，包含了源 `Blob` 对象中指定范围内的数据。

`Blob` 对象表示一个不可变、原始数据的类文件对象，它的数据可以按文本或二进制的格式进行读取，可以转化成 `ReadableStream` 来用于数据操作。 `File` 接口基于 `Blob` , 继承了 `Blob` 的功能并将其扩展使其支持用户系统上的文件。

预先将要上传的文件通过 `Blob.slice` 进行切片, 并且使用 *`FileReader.readAsArrayBuffer` 读取分片文件，* `spark-md5.ArrayBuffer` 计算整个文件的 `md5` 对文件进行标记。借助 `http` 的可并发性，同时上传多个切片，大大减少了上传时间。由于并发上传，传输到服务端的顺序可能会发生变化，每个切片使用 `${md5}-${index}` 进行标记，记录每个切片的顺序。

### 服务端

服务端需要负责接收这些切片。并在接收到所有切片后合并切片。合并切片主要用到 `Nodejs` 的读写流 `ReadStream/writeStream` , 将所有的切片流传输到最终文件的流里。

服务端需要客户端主动通知服务端进行切片的合并，或者自己计算切片数量主动合并。

### 技术细节

1. 显示上传进度条
    1. `XMLHttpRequest` 原生支持上传进度的监听，监听 `xhr.upload.onprogress`
    2. `Axios` 封装了 `onUploadProgress` 函数
    3. 通用 `progress` 说明
    - `event.lengthComputable`这是一个状态，表示发送的长度有了变化，可计算
    - `event.loaded`表示发送了多少字节
    - `event.total`表示文件总大小
    - 根据`event.loaded`和`event.total`计算进度
2. 断点续传
    
    分片上传后 服务端存储分片上传记录，文件重新上传后
    
    - 先拉取文件是否有上传通过 `fileHash` ,如果成功上传则返回文件信息，此处属于 `文件秒传`
    - 未上传成功，并且没有上传记录，返回信息 `uploadID` 给前端，前端重新发起上传请求，生成上传唯一 `uploadID`（可基于用户信息 & `fileHash`）
    - 未上传成功，有上传记录，返回已上传的分片 `${hash}-${index}` 以及 `uploadID`。通过对比只需要上传未上传的分片。最后请求分片合成文件，此为 `断点续传`。
3. 文件秒传
同断点续传描述第一项
4. 暂停/恢复上传
    
    暂停：
    
    - `XMLHttpRequest` 原生的 `abort` 方法，需要保存所有的 `xhr` 对象，遍历结束正在上传的请求。浏览器网络切换到 `slow 3G`  感觉明显
    - `Axios` 使用配置项 `cancelToken` 来实现
    
    恢复：
    
    - 查看所有分片数据，未上传成功的重新发起请求
    - 如果此时刷新页面丢失上传数据，此时重新上传为 `断点续传`

### 接口

- `search` 根据生成 `fileHash` 和其他文件信息 生成 `uploadID` 来判断文件的上传状态，返回后续操作信息
- `getId` 根据生成 `fileHash` 和其他文件信息 生成 `uploadID` , 并且创建临时文件存储分片文件。
- `upload` 使用 `formData` 上传分片，并保存在分片目录中，记录分片信息
- `result` 前端上传完所有分片后，发起合并请求，返回结果 。

### 参考文献

[敲起来！Koa2 + Vue3 演练大文件分片上传 - 掘金 (juejin.cn)](https://juejin.cn/post/7016498747496464415#heading-11)

[字节跳动面试官：请你实现一个大文件上传和断点续传 - 掘金 (juejin.cn)](https://juejin.cn/post/6844904046436843527#heading-11)