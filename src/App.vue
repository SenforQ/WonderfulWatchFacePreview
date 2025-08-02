<template>
  <div
    class="absolute"
    :style="{
      top: previewElementBounding?.top + 'px',
      left: previewElementBounding?.left + 'px',
      zIndex: 1000,
    }"
  >
    <div>
      <button @click="snapshot">点击截图</button>，已截图{{ manualFiles.length }}张，
      <button @click="download(manualFiles)">全部导出</button>,
      <button @click="clear">清空全量</button>
    </div>
    <div>
      <button @click="downloadSingle()">当前表盘截图导出</button>
    </div>
    <div>
      <button @click="downloadXlsxTemplate">下载模板</button>，
      <button @click="uploadXlsx">上传xlsx</button>，
      <button @click="autoInput">自动录入并导出</button>
    </div>
    <div style="margin-top: 20px">
      <div>关键帧</div>
      下载第
      <input style="width: 100px; color: skyblue" type="text" v-model="frameValue" />
      帧
      <button @click="snapshotByFrame(frameValue - 1)">确认</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import * as xlsx from '@/utils/xlsx'
import { useFileDialog } from '@vueuse/core'
import { defaultFrames } from '@/config/frame'
const frameValue = ref(0)
const previewElementBounding = ref<DOMRect | null>(null)
const manualFiles = ref<File[]>([])
const scriptFiles = ref<File[]>([])
const { open, onChange, reset } = useFileDialog({
  accept: '.xlsx',
})
const getPreviewElementPosition = () => {
  //预览区元素的id为workbench-outer
  const el = document.querySelector('#workbench-outer')
  previewElementBounding.value = el?.getBoundingClientRect() ?? null
}
onMounted(() => {
  getPreviewElementPosition()
})
const xlsxData = ref([])

const parseXlsx = (file: File) => {
  return new Promise(async (resolve, reject) => {
    const workBook = xlsx.read(await file.arrayBuffer())

    resolve(xlsx.utils.sheet_to_json(workBook.Sheets[workBook.SheetNames[0]]))
  })
}

const clear = () => {
  manualFiles.value.length = 0
}
function findElementsWithText(text: string, element: Node) {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)

  const elements = new Set()
  let node

  while ((node = walker.nextNode())) {
    if (node.nodeValue?.includes(text)) {
      elements.add(node.parentElement)
    }
  }

  return Array.from(elements)
}
const tags = ['时间日期', '运动健康', '工具类']
const autoArr = [
  ['小时', '分', '秒', '月', '日'],
  ['步数', '卡路里', '心率', '压力指数'],
  ['天气', '电量'],
]
// const autoArr = [
//   ['时间', '年', '月', '日'],
//   ['步数', '步数完成进度', '步数目标', '卡路里', '卡路里完成度', '卡路里目标'],
//   ['电量'],
// ]

/** 格式化从xlsx导入的数据 */
const formatXlsxToData = (xlsxData: Record<string, any>[]) => {
  const arr: { label: string; value: string[] }[] = []
  Object.keys(xlsxData[0]).forEach((key) => {
    arr.push({
      label: key,
      value: xlsxData.map((item) => item[key]),
    })
  })
  const timeData = arr.find((item) => item.label === '时间')
  if (timeData) {
    const time = xlsxData
      .map((item) => item['时间'])
      .map((timeStr) => {
        return xlsx.excelTimeToHHMMSS(timeStr).split(':')
      })

    arr.push({
      label: '小时',
      value: time.map((item) => item[0]),
    })
    arr.push({
      label: '分',
      value: time.map((item) => item[1]),
    })
    arr.push({
      label: '秒',
      value: time.map((item) => item[2]),
    })
  }
  return arr
}

let dataSetting = formatXlsxToData(defaultFrames)
onChange((files) => {
  const file = files?.item(0)
  if (file) {
    parseXlsx(file).then((res: any) => {
      dataSetting = formatXlsxToData(res)
      debugger
    })
  }
})
/** 执行所有帧并截图 */
const autoInput = async () => {
  scriptFiles.value.length = 0
  for (let i = 0; i < dataSetting[0].value.length; i++) {
    await autoByFrame(i)
    await sleep(500)
    const file = await canvasToFile()

    scriptFiles.value.push(file)
    console.log(file, scriptFiles.value, 'aa')
  }

  download(scriptFiles.value)
}

/** 触发应用内部的输入值变更逻辑 */
const editInputValue = (el: HTMLInputElement, value: string = '1') => {
  if (el) {
    el.focus()
    el.value = value
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

/** 打开输入框的react-select弹窗 */
const openReactSelect = (el: HTMLInputElement) => {
  if (el) {
    el.focus()
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

/** 找到选项并点击 */
const clickReactSelectOption = async (value: string) => {
  let element
  let scrollTop = 0
  while (!element) {
    await sleep(100)
    element = document.querySelector(`.ant-select-item.ant-select-item-option[title="${value}"]`)
    if (!element) {
      const scrollBoxInner = document.querySelector(`.rc-virtual-list-holder-inner`)
      if (!scrollBoxInner?.parentElement?.parentElement) return
      const scrollBox = scrollBoxInner.parentElement.parentElement
      scrollBox.scrollTop = scrollTop
      scrollBox.scrollTop += 100
      console.log(scrollBox.scrollTop, scrollTop, element)
      if (scrollBox.scrollTop === scrollTop) {
        return console.log('没有更多选项了')
      }
      scrollTop = scrollBox.scrollTop

      continue
    }
  }

  console.log('找到了选项', element)
  if (element instanceof HTMLElement) {
    element.click()
  }
}

/** 截图加入文件列表 */
const snapshot = async () => {
  const file = await canvasToFile()
  manualFiles.value.push(file)
}
/** 按帧索引执行脚本 */
const autoByFrame = async (i: number) => {
  const container = document.querySelector('.container')
  for (let j = 0; j < autoArr.length; j++) {
    const item = autoArr[j]
    const index = j
    const tag = tags[index]

    const tagEl = findElementsWithText(tag, container?.previousSibling as Node) as HTMLElement[]
    tagEl[0].click()
    console.log(`点击了${tag}`, '@@')
    await sleep(100)
    for (let k = 0; k < item.length; k++) {
      const text = item[k]
      switch (text) {
        case '天气': {
          const found = dataSetting.find((item) => item.label === text)
          if (!found) return
          const dataArr = found.value
          const elements = findElementsWithText(text, container as Node) as HTMLElement[]
          console.log(`找到文本${text}`, elements, '@@')
          if (elements.length > 0) {
            let inputs
            if (elements[0].nextElementSibling) {
              inputs = elements[0].nextElementSibling.querySelectorAll('input')
            } else {
              inputs = elements[0].parentElement?.nextElementSibling?.querySelectorAll('input')
            }
            console.log(`找到文本${text}对应input`, inputs, dataArr[i], dataArr, i, '@@')
            if (inputs) {
              const input = inputs[0]
              openReactSelect(input)
              await sleep(100)
              await clickReactSelectOption(dataArr[i])
              await sleep(100)
            }
          }
          break
        }
        default: {
          const dataArr = dataSetting.find((item) => item.label === text)!.value

          const elements = findElementsWithText(text, container as Node) as HTMLElement[]
          console.log(`找到文本${text}`, elements, '@@')
          if (elements.length > 0) {
            let inputs
            if (elements[0].nextElementSibling) {
              inputs = elements[0].nextElementSibling.querySelectorAll('input')
            } else {
              inputs = elements[0].parentElement?.nextElementSibling?.querySelectorAll('input')
            }
            console.log(`找到文本${text}对应input`, inputs, '@@')
            if (inputs) {
              const input = inputs[0]
              editInputValue(input, dataArr[i])
              console.log(tag, text, input.value, '@@')
              await sleep(100)
            }
          }
          break
        }
      }
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 执行一帧并截图导出 */
const snapshotByFrame = async (i: number) => {
  await autoByFrame(i)
  await sleep(500)
  downloadSingle(i)
}

/** 不改变表盘并截图导出 */
const downloadSingle = async (i?: number) => {
  const file = await canvasToFile()
  if (i) {
    const now = new Date().getTime()
    downloadPng(file, `${now}_第${i + 1}帧.png`)
  } else {
    downloadPng(file)
  }
}
/** canvas转换file */
const canvasToFile = (): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas: HTMLCanvasElement = document.querySelector('#watch-canvas') as HTMLCanvasElement
    if (!canvas) {
      reject('canvas不存在')
    }
    canvas.toBlob((blob) => {
      if (!blob) return reject('blob不存在')
      const now = new Date().getTime()
      resolve(new File([blob], `${now}.png`, { type: 'image/png' }))
    })
  })
}
/** 下载通过脚本获取的图片zip文件 */
const download = async (files: File[]) => {
  const jszip = new JSZip()

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const now = new Date().getTime()
    jszip.file(`pic-${now}-${i}.png`, file)

    console.log(jszip.files, 'bb', file)
  }

  await jszip
    .generateAsync({
      type: 'blob',
    })
    .then((res) => {
      const now = new Date().getTime()
      saveAs(res, `${now}.zip`)
    })
}
const downloadPng = async (file: File, fileName?: string) => {
  saveAs(file, `${fileName ?? file.name}`)
}

const downloadXlsxTemplate = () => {
  const workBook = xlsx.utils.book_new()
  const workSheet = xlsx.utils.json_to_sheet(defaultFrames)
  xlsx.utils.book_append_sheet(workBook, workSheet, 'Sheet1')
  xlsx.writeFileXLSX(workBook, 'template.xlsx')
}
const uploadXlsx = () => {
  reset()
  open()
}
</script>
<style lang="scss"></style>
