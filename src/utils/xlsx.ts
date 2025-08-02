import { utils, writeFileXLSX, read } from 'xlsx'

// 1. Excel 时间小数 → "HH:MM:SS" 字符串
function excelTimeToHHMMSS(excelTime: number) {
  const totalSeconds = Math.round(excelTime * 86400) // 24*60*60
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 2. "HH:MM:SS" 字符串 → Excel 时间小数
function HHMMSSToExcelTime(timeStr: string) {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number)
  return hours / 24 + minutes / 1440 + seconds / 86400
}

export { utils, writeFileXLSX, read, excelTimeToHHMMSS, HHMMSSToExcelTime }
