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
    <div style="margin-top: 20px">
      <div>
        序列帧配置,
        <button @click="addKeyFrameConfig">添加</button>
      </div>
      <template v-for="(item, index) in keyFrameConfig">
        <div>
          名称：<input type="text" v-model="item.label" style="color: skyblue; width: 100px" />
        </div>
        <div>
          序列帧图片数量：<input
            type="text"
            v-model="item.imgNumber"
            style="color: skyblue; width: 100px"
          />
        </div>
        <div>
          帧率：<input type="text" v-model="item.frameRate" style="color: skyblue; width: 100px" />
        </div>

        <button @click="deleteKeyFrameConfig(index)">删除</button>
      </template>
      <div>
        <button @click="findKeyFrame">确认</button>
      </div>
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
const frameValue = ref(1)
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

const keyFrameConfig = ref<
  {
    label: string
    imgNumber: number
    frameRate: number
  }[]
>([])
const addKeyFrameConfig = () => {
  keyFrameConfig.value.push({
    label: '序列帧1',
    imgNumber: 30,
    frameRate: 30,
  })
}
const deleteKeyFrameConfig = (index: number) => {
  const delItems = keyFrameConfig.value.splice(index, 1)
  delItems.forEach((item) => {
    const foundIndex = dataSetting.findIndex((item) => item.label === delItems[0].label)
    if (foundIndex > -1) {
      dataSetting.splice(foundIndex, 1)
    }
  })
}
/** 将xlsx转为脚本需要的数据 */
const parseXlsx = (file: File) => {
  return new Promise(async (resolve, reject) => {
    const workBook = xlsx.read(await file.arrayBuffer())

    resolve(xlsx.utils.sheet_to_json(workBook.Sheets[workBook.SheetNames[0]]))
  })
}

/** 清除手动截图的缓存 */
const clear = () => {
  manualFiles.value.length = 0
}

/** 根据文本在容器内查找元素 */
function findElementsWithText(text: string, element: Node): (HTMLElement | null)[] {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null)

  const elements = new Set<HTMLElement | null>()
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
  console.log('🔧 开始格式化数据，输入数据长度:', xlsxData.length)
  console.log('🔧 输入数据第一行:', xlsxData[0])
  
  const arr: { label: string; value: string[] }[] = []
  Object.keys(xlsxData[0]).forEach((key) => {
    arr.push({
      label: key,
      value: xlsxData.map((item) => item[key]),
    })
  })
  
  console.log('🔧 基础格式化后的数组:', arr)
  console.log('🔧 基础格式化后的数组长度:', arr.length)
  
  const timeData = arr.find((item) => item.label === '时间')
  if (timeData) {
    console.log('🔧 找到时间字段，开始处理时间数据')
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
    
    console.log('🔧 时间字段处理完成，最终数组长度:', arr.length)
  } else {
    console.log('🔧 未找到时间字段')
  }
  
  console.log('🔧 最终格式化结果:', arr)
  return arr
}

let dataSetting = formatXlsxToData(defaultFrames)
console.log('🚀 初始化 dataSetting:', dataSetting)
console.log('🚀 初始化 dataSetting 长度:', dataSetting.length)
onChange((files) => {
  const file = files?.item(0)
  if (file) {
    console.log('📁 上传的文件:', file.name, file.size, 'bytes')
    parseXlsx(file).then((res: any) => {
      console.log('📊 解析后的原始数据:', res)
      console.log('📊 原始数据长度:', res.length)
      console.log('📊 原始数据第一行:', res[0])
      
      dataSetting = formatXlsxToData(res)
      console.log('🔄 格式化后的数据:', dataSetting)
      console.log('🔄 格式化后数据长度:', dataSetting.length)
      console.log('🔄 格式化后第一项:', dataSetting[0])
      
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
  // 输入框的逻辑
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

  // 图片序列帧的逻辑
  const keyFrameRunList = Array.from(keyFrameMap.keys())
  console.log('图片序列帧的逻辑', keyFrameRunList, keyFrameMap)
  for (let j = 0; j < keyFrameRunList.length; j++) {
    const label = keyFrameRunList[j]
    console.log('时间关键帧label', label)

    const found = dataSetting.find((item) => item.label === label)
    if (!found) continue
    console.log('时间关键帧value', found, found.value, found.value[i], i)
    await runChooseKeyFrame(label, found.value[i])
    await sleep(100)
  }
}

/** 延时函数 */
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

const keyFrameMap: Map<string, HTMLElement> = new Map()
const findKeyFrame = () => {
  const elArr = document.querySelectorAll('.h-10.cursor-default.border-transparent.overflow-hidden')
  keyFrameConfig.value.map((keyFrame) => {
    for (let i = 0; i < elArr.length; i++) {
      const els = findElementsWithText(keyFrame.label, elArr[i]) as HTMLElement[]
      if (els[0]) {
        if (els[0]) {
          keyFrameMap.set(keyFrame.label, els[0])
          const keyFrameValue = []
          // 计算每张图片的停留帧数
          //const stayFrameEachImg = Math.round(keyFrame.frameRate / keyFrame.imgNumber)
          const stayFrameEachImg = Math.round(30 / keyFrame.frameRate)
          const allFrameLength = dataSetting[0].value.length

          for (let i = 0; i < keyFrame.imgNumber; i++) {
            for (let j = 0; j < stayFrameEachImg; j++) {
              if (keyFrameValue.length >= allFrameLength) {
                break
              }
              keyFrameValue.push(String(i))
            }
          }
          while (keyFrameValue.length < allFrameLength) {
            keyFrameValue.push(...keyFrameValue)
          }
          keyFrameValue.length = allFrameLength
          const found = dataSetting.find((item) => item.label === keyFrame.label)
          if (found) {
            found.value = keyFrameValue
          } else {
            dataSetting.push({
              label: keyFrame.label,
              value: keyFrameValue,
            })
          }
        }
      }
    }
  })
  console.log(dataSetting)
}
const clickSidebarItem = (el: HTMLElement) => {
  const rect = el.getBoundingClientRect()
  if (el?.parentElement?.parentElement?.parentElement?.parentElement) {
    const clickEvent = new MouseEvent('click', {
      clientX: rect.left,
      clientY: rect.top,
    })
    console.log('侧边栏', el, '@@')
    el?.parentElement?.parentElement?.parentElement?.parentElement.dispatchEvent(clickEvent)
  }
}

/** 执行脚本选择关键帧, value从0开始 */
const runChooseKeyFrame = async (keyFrameLabel: string, value: string) => {
  const el = keyFrameMap.get(keyFrameLabel)
  if (!el) return
  clickSidebarItem(el)
  await sleep(100)
  console.log(`第${String(Number(value) + 1)}帧`)
  findKeyFrameImg(value)
}
const findKeyFrameImg = async (value: string) => {
  const el: HTMLElement | null = document.querySelector('img[alt="序列帧图片"]')
  console.log(`'找到了序列帧图片'`, el)
  if (!el) return
  el.click()
  await sleep(100)
  const el2: HTMLElement | null = document.querySelector(`img[alt="序列帧图片${value}"]`)
  console.log(`'找到了图片${value}'`, el2)
  if (!el2) return
  el2.click()
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
/** 下载图片 */
const downloadPng = async (file: File, fileName?: string) => {
  saveAs(file, `${fileName ?? file.name}`)
}

/** 下载xlsx模板 */
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
