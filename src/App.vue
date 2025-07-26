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
      <template v-for="item in 9">
        <div>
          <button @click="snapshotByFrame(item - 1)">下载第{{ item }}帧</button>
        </div>
      </template>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import * as xlsx from '@/utils/xlsx'
import { useFileDialog } from '@vueuse/core'

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

const parseXlsx = (file: File) => {
  return new Promise(async (resolve, reject) => {
    const workBook = xlsx.read(await file.arrayBuffer(), { cellDates: true })

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
  ['小时', '分', '秒'],
  ['步数', '卡路里', '心率'],
  ['天气', '电量'],
]
// const autoArr = [
//   ['时间', '年', '月', '日'],
//   ['步数', '步数完成进度', '步数目标', '卡路里', '卡路里完成度', '卡路里目标'],
//   ['电量'],
// ]
const dataSetting = [
  // {
  //   label: '时间',
  //   value: [
  //     '09:28:00',
  //     '11:32:00',
  //     '13:48:00',
  //     '16:04:00',
  //     '18:18:00',
  //     '22:03:00',
  //     '01:52:00',
  //     '05:02:00',
  //     '07:30:00',
  //   ],
  // },
  {
    label: '小时',
    // 拆分出所有时间中的 "小时" 部分
    value: ['09', '11', '13', '16', '18', '22', '01', '05', '07'],
  },
  {
    label: '分',
    // 拆分出所有时间中的 "分" 部分
    value: ['28', '32', '48', '04', '18', '03', '52', '02', '30'],
  },
  {
    label: '秒',
    // 拆分出所有时间中的 "秒" 部分
    value: ['00', '00', '00', '00', '00', '00', '00', '00', '00'],
  },
  {
    label: '步数',
    value: ['2560', '3680', '4086', '5846', '6424', '7898', '25', '68', '106'],
  },
  {
    label: '心率',
    value: ['78', '80', '88', '92', '94', '69', '56', '72', '82'],
  },
  {
    label: '卡路里',
    value: ['162', '392', '453', '534', '687', '825', '12', '48', '99'],
  },
]

onChange((files) => {
  const file = files?.item(0)
  debugger
  if (file) {
    parseXlsx(file).then((res) => {
      debugger
      xlsxData.value = res as any[]
    })
  }
})

const xlsxData = ref<any[]>([])
/** 执行所有帧并截图 */
const autoInput = async () => {
  scriptFiles.value.length = 0
  for (let i = 0; i < 9; i++) {
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
const findReactSelectOption = (value: string) => {
  const element = document.querySelector(
    `.ant-select-item.ant-select-item-option[title="${value}"]`,
  )
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
    await Promise.all(
      item.map(async (text) => {
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
        return text
      }),
    )
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
  const workSheet = xlsx.utils.json_to_sheet([
    {
      name: 'name',
      age: 'age',
    },
    {
      name: 'name1',
      age: 'age2',
    },
  ])
  xlsx.utils.book_append_sheet(workBook, workSheet, 'Sheet1')
  xlsx.writeFileXLSX(workBook, 'template.xlsx')
}
const uploadXlsx = () => {
  reset()
  open()
}
</script>
<style lang="scss"></style>
