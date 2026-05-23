import { exportApi } from "@/lib/api"

export async function downloadCsv(entity: string) {
  const { data } = await exportApi.csv(entity)
  const url = URL.createObjectURL(data)
  const a = document.createElement("a")
  a.href = url
  a.download = `${entity}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
