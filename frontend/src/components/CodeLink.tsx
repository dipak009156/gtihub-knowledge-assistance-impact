import React from 'react'
import { Link, useParams } from 'react-router-dom'

interface CodeLinkProps {
  file: string
  line?: number
  end?: number
  repoId?: number | string
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const CodeLink: React.FC<CodeLinkProps> = ({
  file,
  line,
  end,
  repoId: propRepoId,
  children,
  className = '',
  style,
}) => {
  const params = useParams<{ id: string }>()
  const id = propRepoId ?? params.id

  const searchParams = new URLSearchParams()
  searchParams.set('path', file)
  if (line !== undefined) searchParams.set('line', String(line))
  if (end !== undefined) searchParams.set('end', String(end))

  const to = id ? `/repos/${id}/code?${searchParams.toString()}` : '#'

  return (
    <Link to={to} className={`code-link ${className}`} style={style}>
      {children || `${file}${line ? `:${line}${end ? `-${end}` : ''}` : ''}`}
    </Link>
  )
}
