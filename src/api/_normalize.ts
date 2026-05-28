// 后端 product.images 字段是逗号分隔字符串 (商家上传多张图时, 商家工作台
// 用 imgUrls.join(',') 拼存到 product.images 列).
// FE 用 string[] 更直观: 取首图 = images[0], 详情轮播 = images.map(...).
// 在 API 边界统一 normalize, 下游所有 .images[N] 用法不动.
//
// types/api.ts 的 ProductDetailResp.images 已声明 string[]; 这里负责把
// 后端 string 实际值"翻译"成符合声明的形状.

type WithMaybeImages = { images?: unknown }

export function normalizeImages<T extends WithMaybeImages>(p: T): T {
  const raw = p.images
  if (typeof raw === 'string') {
    ;(p as unknown as { images: string[] }).images = raw
      ? raw.split(',').filter(Boolean)
      : []
  } else if (!raw) {
    ;(p as unknown as { images: string[] }).images = []
  }
  return p
}

// 列表场景: 处理 { products: [...] } 形状响应
export function normalizeImagesInList<T extends { products?: WithMaybeImages[] }>(r: T): T {
  if (r.products) {
    for (const p of r.products) normalizeImages(p)
  }
  return r
}
