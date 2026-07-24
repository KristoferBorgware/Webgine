import { Box, Chip, Typography } from '@mui/material';
import type { TreeNode } from '@webgine/engine';

/** Left panel: the scene hierarchy as an indented, selectable tree. */
export function HierarchyPanel({
  tree,
  selectedId,
  onSelect,
}: {
  tree: TreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <Box sx={{ width: 240, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PanelTitle>Hierarchy</PanelTitle>
      <Box sx={{ overflow: 'auto', flex: 1, py: 0.5 }}>
        {tree.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </Box>
    </Box>
  );
}

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selectable = node.kind === 'gameObject';
  const selected = node.id === selectedId;
  return (
    <>
      <Box
        onClick={() => selectable && onSelect(node.id)}
        sx={{
          pl: 1.5 + depth * 1.5,
          pr: 1,
          py: 0.4,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: selectable ? 'pointer' : 'default',
          bgcolor: selected ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: selectable && !selected ? 'action.hover' : undefined },
        }}
      >
        <Typography variant="body2" sx={{ color: selectable ? 'text.primary' : 'text.secondary' }}>
          {node.name}
        </Typography>
        {node.kind === 'camera' && <Chip size="small" variant="outlined" label="camera" />}
      </Box>
      {node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{ px: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', color: 'text.secondary' }}
    >
      {children}
    </Typography>
  );
}
