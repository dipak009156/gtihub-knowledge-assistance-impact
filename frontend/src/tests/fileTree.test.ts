import { describe, expect, it } from 'vitest'
import { buildFileTree } from '../lib/fileTree'

describe('buildFileTree', () => {
  it("converts ['a/b.py', 'a/c.py', 'd.py'] into the right tree", () => {
    const tree = buildFileTree(['a/b.py', 'a/c.py', 'd.py'])

    // Folder 'a' comes first, then 'd.py'
    expect(tree).toHaveLength(2)
    expect(tree[0].name).toBe('a')
    expect(tree[0].isFolder).toBe(true)
    expect(tree[0].children).toHaveLength(2)

    expect(tree[0].children?.[0].name).toBe('b.py')
    expect(tree[0].children?.[0].path).toBe('a/b.py')
    expect(tree[0].children?.[0].isFolder).toBe(false)

    expect(tree[0].children?.[1].name).toBe('c.py')
    expect(tree[0].children?.[1].path).toBe('a/c.py')

    expect(tree[1].name).toBe('d.py')
    expect(tree[1].path).toBe('d.py')
    expect(tree[1].isFolder).toBe(false)
  })

  it('handles empty path list safely', () => {
    const tree = buildFileTree([])
    expect(tree).toEqual([])
  })
})

