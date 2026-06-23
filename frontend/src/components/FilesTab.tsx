import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type Deployment, type FileEntry, type FileContent } from '../lib/api';
import { EmptyState, Spinner } from './ui';
import {
  IconFolder, IconFileCode, IconFileReact, IconFileJson, IconFileMarkdown,
  IconFileCss, IconFileHtml, IconFileImage, IconFileLock, IconFileBlank,
  IconCornerUpLeft,
} from './icons';

function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const FILE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  js: IconFileCode, ts: IconFileCode, tsx: IconFileReact, jsx: IconFileReact,
  json: IconFileJson, md: IconFileMarkdown, css: IconFileCss,
  html: IconFileHtml, svg: IconFileImage, png: IconFileImage, jpg: IconFileImage,
  lock: IconFileLock,
};
function IconForFile({ entry }: { entry: FileEntry }) {
  if (entry.type === 'dir') return <IconFolder className="w-4 h-4 text-amber-400" />;
  const ext = entry.name.split('.').pop() || '';
  const Comp = FILE_ICONS[ext] || IconFileBlank;
  return <Comp className="w-4 h-4 text-slate-400" />;
}

export function FilesTab({ deployment }: { deployment: Deployment | null }) {
  const { t } = useTranslation();
  const [path, setPath] = useState('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<FileContent | null>(null);
  const [fileLoading, setFileLoading] = useState(false);

  useEffect(() => {
    setPath('');
    setFile(null);
  }, [deployment?.id]);

  useEffect(() => {
    if (!deployment) return;
    setLoading(true);
    setError(null);
    api
      .deploymentFiles(deployment.id, path)
      .then(({ entries }) => setEntries(entries))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [deployment?.id, path]);

  if (!deployment) return <EmptyState title={t('files.noDeployment')}>{t('files.noDeploymentBody')}</EmptyState>;

  const openEntry = (e: FileEntry) => {
    const next = path ? `${path}/${e.name}` : e.name;
    if (e.type === 'dir') {
      setPath(next);
      setFile(null);
    } else {
      setFileLoading(true);
      api
        .deploymentFile(deployment.id, next)
        .then(setFile)
        .catch((err) => setFile({ path: next, size: 0, truncated: false, binary: false, content: `// ${err.message}` }))
        .finally(() => setFileLoading(false));
    }
  };

  const crumbs = ['root', ...path.split('/').filter(Boolean)];

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b border-white/5 px-3 py-2 text-xs text-slate-400">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-600">/</span>}
              <button
                className="hover:text-slate-800 dark:hover:text-slate-200"
                onClick={() => setPath(crumbs.slice(1, i + 1).join('/'))}
              >
                {i === 0 ? t('files.root') : c}
              </button>
            </span>
          ))}
        </div>
        <div className="max-h-[460px] overflow-auto">
          {loading ? (
            <div className="flex justify-center p-6"><Spinner /></div>
          ) : error ? (
            <div className="p-4 text-sm text-red-600 dark:text-red-300">{error}</div>
          ) : (
            <>
              {path !== '' && (
                <button className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:bg-white/[0.04]" onClick={() => setPath(path.split('/').slice(0, -1).join('/'))}>
                  <IconCornerUpLeft className="w-3.5 h-3.5" /> ..
                </button>
              )}
              {entries.map((e) => (
                <button key={e.name} className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/[0.04]" onClick={() => openEntry(e)}>
                  <span className="flex min-w-0 items-center gap-2">
                    <IconForFile entry={e} />
                    <span className="truncate text-slate-700 dark:text-slate-300">{e.name}</span>
                  </span>
                  {e.type === 'file' && <span className="shrink-0 text-xs text-slate-600">{fmtSize(e.size)}</span>}
                </button>
              ))}
              {entries.length === 0 && <div className="p-4 text-sm text-slate-500">{t('files.emptyDir')}</div>}
            </>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">
          {file ? <span className="font-mono text-xs">{file.path}</span> : t('files.selectFile')}
        </div>
        <div className="max-h-[460px] overflow-auto">
          {fileLoading ? (
            <div className="flex justify-center p-6"><Spinner /></div>
          ) : !file ? (
            <div className="p-6 text-sm text-slate-500">{t('files.pickFile')}</div>
          ) : file.binary ? (
            <div className="p-6 text-sm text-slate-500">{t('files.binary', { size: fmtSize(file.size) })}</div>
          ) : (
            <pre className="whitespace-pre-wrap break-all p-4 font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300">{file.content}</pre>
          )}
        </div>
      </div>
    </div>
  );
}
