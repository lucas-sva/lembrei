import type { Tag } from '../types'

interface MetaTagsProps {
  tags: Tag[]
}

export default function MetaTags({ tags }: MetaTagsProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="chip text-white"
          style={{ backgroundColor: tag.cor + '33', color: tag.cor, border: `1px solid ${tag.cor}55` }}
        >
          {tag.nome}
        </span>
      ))}
    </div>
  )
}
