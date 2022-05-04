self.importScripts("/src/spark-md5.min.js"); // 导入脚本

// 生成文件 hash
self.onmessage = (e: MessageEvent) => {
  const { fileChunks } = e.data;
  const spark = new self.SparkMD5.ArrayBuffer();
  let percentage = 0;
  let count = 0;
  const loadNext = (index: number) => {
    const reader = new FileReader();
    reader.readAsArrayBuffer(fileChunks[index].file);
    reader.onload = (e: ProgressEvent<EventTarget>) => {
      count++;
      spark.append((e.target! as any).result);
      if (count === fileChunks.length) {
        self.postMessage({
          percentage: 100,
          hash: spark.end()
        });
        self.close();
      } else {
        percentage += 100 / fileChunks.length;
        self.postMessage({
          percentage: Number(percentage.toFixed(2))
        });
        loadNext(count);
      }
    };
  };
  loadNext(0);
};
