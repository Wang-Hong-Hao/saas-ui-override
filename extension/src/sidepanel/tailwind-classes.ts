/**
 * 常见 Tailwind utility 词表(方案第 13 章:支持中文关键词搜索)。
 * 只覆盖常用类别的常用值,不引入整个 Tailwind;词表外也可手动输入任意 class。
 */

export interface TailwindCategory {
  name: string
  /** 中文 / 英文搜索关键词 */
  keywords: string[]
  classes: string[]
}

export const TAILWIND_CLASSES: TailwindCategory[] = [
  {
    name: '圆角',
    keywords: ['圆角', 'rounded', 'radius'],
    classes: ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'],
  },
  {
    name: '字重',
    keywords: ['字体', '字重', 'font', 'weight', '粗细'],
    classes: ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
  },
  {
    name: '字号',
    keywords: ['字体', '字号', '文字', '大小', 'text', 'size'],
    classes: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl'],
  },
  {
    name: '文字颜色',
    keywords: ['颜色', '文字颜色', 'color', 'text'],
    classes: ['text-white', 'text-black', 'text-gray-400', 'text-gray-500', 'text-gray-700', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-blue-500', 'text-purple-500'],
  },
  {
    name: '背景',
    keywords: ['背景', 'background', 'bg'],
    classes: ['bg-transparent', 'bg-white', 'bg-black', 'bg-gray-100', 'bg-gray-200', 'bg-gray-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-purple-500'],
  },
  {
    name: '内边距',
    keywords: ['间距', '内边距', 'padding', 'p'],
    classes: ['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'p-10', 'p-12', 'p-16', 'px-2', 'px-4', 'px-6', 'py-1', 'py-2', 'py-3', 'py-4'],
  },
  {
    name: '外边距',
    keywords: ['间距', '外边距', 'margin', 'm'],
    classes: ['m-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-6', 'm-8', 'mx-auto', 'my-2', 'my-4', 'mt-2', 'mt-4', 'mb-2', 'mb-4', 'ml-2', 'mr-2'],
  },
  {
    name: '阴影',
    keywords: ['阴影', 'shadow'],
    classes: ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'],
  },
  {
    name: '布局',
    keywords: ['布局', '显示', '隐藏', 'display'],
    classes: ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'hidden'],
  },
  {
    name: 'Flex',
    keywords: ['flex', '弹性', '对齐', '排列'],
    classes: ['flex-row', 'flex-col', 'flex-wrap', 'items-start', 'items-center', 'items-end', 'items-baseline', 'justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8'],
  },
  {
    name: '边框',
    keywords: ['边框', 'border'],
    classes: ['border', 'border-0', 'border-2', 'border-4', 'border-gray-200', 'border-gray-300', 'border-red-500', 'border-blue-500', 'border-dashed', 'border-solid'],
  },
  {
    name: '宽高',
    keywords: ['宽度', '高度', '宽高', 'width', 'height', 'w', 'h'],
    classes: ['w-full', 'w-auto', 'w-1/2', 'w-1/3', 'w-screen', 'h-full', 'h-auto', 'h-screen', 'min-w-0', 'min-h-0', 'max-w-full', 'max-w-screen-md'],
  },
  {
    name: '其他常用',
    keywords: ['透明度', '光标', '过度', '过渡', 'transition', 'opacity', 'cursor', '溢出', 'overflow'],
    classes: ['opacity-0', 'opacity-50', 'opacity-100', 'cursor-pointer', 'cursor-not-allowed', 'transition', 'duration-200', 'overflow-hidden', 'overflow-auto', 'truncate'],
  },
]

/** 按中文关键词 / class 名搜索,返回去重后的候选 class */
export function searchTailwindClasses(query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matched = new Set<string>()
  for (const category of TAILWIND_CLASSES) {
    const categoryHit = category.name.includes(q) || category.keywords.some((k) => k.toLowerCase().includes(q))
    for (const cls of category.classes) {
      if (categoryHit || cls.toLowerCase().includes(q)) matched.add(cls)
    }
  }
  return [...matched]
}
