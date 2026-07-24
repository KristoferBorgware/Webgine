import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Checkbox,
  Divider,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Vector3, type ComponentDescriptor, type InspectorData } from '@webgine/engine';
import type { ScriptParameter } from '@webgine/scripting';
import { PanelTitle } from './HierarchyPanel';

type Vec3 = [number, number, number];

/** Right panel: transform + components of the selected object; scripts expose their params. */
export function InspectorPanel({
  inspector,
  scriptParams,
  source,
  onSetPosition,
  onSetRotation,
  onSetScale,
  onSetParam,
  onSourceChange,
}: {
  inspector: InspectorData | null;
  scriptParams: ScriptParameter[];
  source: string;
  onSetPosition: (v: Vec3) => void;
  onSetRotation: (v: Vec3) => void;
  onSetScale: (v: Vec3) => void;
  onSetParam: (key: string, value: unknown) => void;
  onSourceChange: (source: string) => void;
}) {
  return (
    <Box sx={{ width: 320, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PanelTitle>Inspector</PanelTitle>
      <Box sx={{ overflow: 'auto', flex: 1, p: 1.5 }}>
        {!inspector ? (
          <Typography variant="body2" color="text.secondary">
            Select an object to inspect it.
          </Typography>
        ) : (
          <Stack spacing={2}>
            <Typography variant="subtitle1">{inspector.name}</Typography>

            <Section title="Transform">
              <Vec3Field
                label="Position"
                value={inspector.transform.position}
                onChange={onSetPosition}
              />
              <Vec3Field
                label="Rotation °"
                value={inspector.transform.rotation}
                onChange={onSetRotation}
              />
              <Vec3Field label="Scale" value={inspector.transform.scale} onChange={onSetScale} />
            </Section>

            {inspector.components.map((component, i) => (
              <ComponentSection
                key={i}
                descriptor={component}
                scriptParams={scriptParams}
                source={source}
                onSetParam={onSetParam}
                onSourceChange={onSourceChange}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function ComponentSection({
  descriptor,
  scriptParams,
  source,
  onSetParam,
  onSourceChange,
}: {
  descriptor: ComponentDescriptor;
  scriptParams: ScriptParameter[];
  source: string;
  onSetParam: (key: string, value: unknown) => void;
  onSourceChange: (source: string) => void;
}) {
  if (descriptor.kind === 'mesh') {
    return (
      <Section title="Mesh">
        <Typography variant="body2" color="text.secondary">
          primitive: {String(descriptor.primitive) || '(custom)'}
        </Typography>
      </Section>
    );
  }

  if (descriptor.kind === 'script') {
    return (
      <Section title={`Script — ${String(descriptor.typeName)}`}>
        {scriptParams.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No exposed parameters.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {scriptParams.map((param) => (
              <ParamRow key={param.key} param={param} onChange={onSetParam} />
            ))}
          </Stack>
        )}
        <Accordion disableGutters elevation={0} sx={{ mt: 1, bgcolor: 'transparent' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
            <Typography variant="caption">Source (hot-reloads)</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0 }}>
            <TextField
              multiline
              fullWidth
              minRows={6}
              value={source}
              onChange={(e) => onSourceChange(e.target.value)}
              slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }}
            />
          </AccordionDetails>
        </Accordion>
      </Section>
    );
  }

  return (
    <Section title={descriptor.kind}>
      <Typography variant="body2" color="text.secondary">
        (no editor)
      </Typography>
    </Section>
  );
}

function ParamRow({
  param,
  onChange,
}: {
  param: ScriptParameter;
  onChange: (key: string, value: unknown) => void;
}) {
  const { key, type, value, options } = param;
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {key}
      </Typography>
      {type === 'number' && (
        <Stack direction="row" spacing={1} alignItems="center">
          {options.min !== undefined && options.max !== undefined && (
            <Slider
              size="small"
              min={options.min}
              max={options.max}
              step={options.step ?? 0.01}
              value={Number(value)}
              onChange={(_, v) => onChange(key, v as number)}
              sx={{ flex: 1 }}
            />
          )}
          <TextField
            size="small"
            type="number"
            value={Number(value)}
            onChange={(e) => onChange(key, Number(e.target.value))}
            sx={{ width: 96 }}
          />
        </Stack>
      )}
      {type === 'boolean' && (
        <Checkbox checked={Boolean(value)} onChange={(e) => onChange(key, e.target.checked)} />
      )}
      {type === 'string' && (
        <TextField
          size="small"
          fullWidth
          value={String(value)}
          onChange={(e) => onChange(key, e.target.value)}
        />
      )}
      {type === 'vector3' && <Vector3Param value={value} onChange={(v) => onChange(key, v)} />}
    </Box>
  );
}

function Vector3Param({ value, onChange }: { value: unknown; onChange: (v: Vector3) => void }) {
  const v = value instanceof Vector3 ? value : new Vector3();
  return (
    <Vec3Field
      label=""
      value={[v.x, v.y, v.z]}
      onChange={([x, y, z]) => onChange(new Vector3(x, y, z))}
    />
  );
}

function Vec3Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Vec3;
  onChange: (v: Vec3) => void;
}) {
  const set = (index: number, next: number) => {
    const out: Vec3 = [...value];
    out[index] = next;
    onChange(out);
  };
  return (
    <Box>
      {label && (
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        {(['x', 'y', 'z'] as const).map((axis, i) => (
          <TextField
            key={axis}
            size="small"
            type="number"
            label={axis}
            value={value[i]}
            onChange={(e) => set(i, Number(e.target.value))}
          />
        ))}
      </Stack>
    </Box>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {children}
    </Box>
  );
}
