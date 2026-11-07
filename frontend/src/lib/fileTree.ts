export interface FileTreeNode {
  name: string
  path: string
  isFolder: boolean
  children?: FileTreeNode[]
}

export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode = {
    name: '',
    path: '',
    isFolder: true,
    children: [],
  }

  for (const p of paths) {
    const parts = p.split('/').filter(Boolean)
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const subPath = parts.slice(0, i + 1).join('/')

      current.children = current.children || []
      let found = current.children.find((c) => c.name === part)

      if (!found) {
        found = {
          name: part,
          path: subPath,
          isFolder: !isLast,
          children: isLast ? undefined : [],
        }
        current.children.push(found)
      }

      current = found
    }
  }

  function sortNodes(nodes?: FileTreeNode[]) {
    if (!nodes) return
    nodes.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) {
      if (node.isFolder && node.children) {
        sortNodes(node.children)
      }
    }
  }

  sortNodes(root.children)
  return root.children || []
}

