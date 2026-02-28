import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useExport } from './use-export';

/* Mock the export service module so the hook calls our stubs */
vi.mock('../services/export-service', () => ({
  exportService: {
    downloadCaseFilePdf: vi.fn(),
    downloadStrPdf: vi.fn(),
    downloadAnalyticsCsv: vi.fn(),
    downloadBulkSars: vi.fn(),
  },
}));

import { exportService } from '../services/export-service';

/* Capture calls to URL.createObjectURL / revokeObjectURL */
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
const mockRevokeObjectURL = vi.fn();
globalThis.URL.createObjectURL = mockCreateObjectURL;
globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

describe('useExport', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    mockRevokeObjectURL.mockClear();

    /* Spy on document.createElement to intercept anchor creation */
    clickSpy = vi.fn();
    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        const anchor = originalCreateElement('a') as HTMLAnchorElement;
        anchor.click = clickSpy;
        return anchor;
      }
      return originalCreateElement(tag);
    });
  });

  it('starts with isExporting false and no error', () => {
    const { result } = renderHook(() => useExport());

    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBeNull();
  });

  it('exportCaseFilePdf calls service and triggers download', async () => {
    const mockBlob = new Blob(['pdf-content']);
    vi.mocked(exportService.downloadCaseFilePdf).mockResolvedValue(mockBlob);

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportCaseFilePdf('alert-42');
    });

    expect(exportService.downloadCaseFilePdf).toHaveBeenCalledWith('alert-42');
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(clickSpy).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(result.current.isExporting).toBe(false);
    expect(result.current.exportError).toBeNull();
  });

  it('exportStrPdf calls service with correct alert ID', async () => {
    const mockBlob = new Blob(['str-content']);
    vi.mocked(exportService.downloadStrPdf).mockResolvedValue(mockBlob);

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportStrPdf('alert-77');
    });

    expect(exportService.downloadStrPdf).toHaveBeenCalledWith('alert-77');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportAnalyticsCsv calls service and triggers download', async () => {
    const mockBlob = new Blob(['csv-data']);
    vi.mocked(exportService.downloadAnalyticsCsv).mockResolvedValue(mockBlob);

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportAnalyticsCsv();
    });

    expect(exportService.downloadAnalyticsCsv).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('exportBulkSars calls service with alert IDs', async () => {
    const mockBlob = new Blob(['zip-content']);
    vi.mocked(exportService.downloadBulkSars).mockResolvedValue(mockBlob);

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportBulkSars(['a1', 'a2']);
    });

    expect(exportService.downloadBulkSars).toHaveBeenCalledWith(['a1', 'a2']);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('sets isExporting to true during download', async () => {
    let resolveBlob: (value: Blob) => void;
    const pendingPromise = new Promise<Blob>((resolve) => {
      resolveBlob = resolve;
    });
    vi.mocked(exportService.downloadCaseFilePdf).mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useExport());

    /* Start the export but do not await yet */
    let exportPromise: Promise<void>;
    act(() => {
      exportPromise = result.current.exportCaseFilePdf('alert-1');
    });

    /* isExporting should be true while the promise is pending */
    expect(result.current.isExporting).toBe(true);

    /* Resolve and complete */
    await act(async () => {
      resolveBlob!(new Blob(['done']));
      await exportPromise!;
    });

    expect(result.current.isExporting).toBe(false);
  });

  it('sets exportError on failure with Error instance', async () => {
    vi.mocked(exportService.downloadCaseFilePdf).mockRejectedValue(
      new Error('Export failed: 500')
    );

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportCaseFilePdf('alert-1');
    });

    expect(result.current.exportError).toBe('Export failed: 500');
    expect(result.current.isExporting).toBe(false);
  });

  it('sets fallback exportError on non-Error rejection', async () => {
    vi.mocked(exportService.downloadStrPdf).mockRejectedValue('unknown');

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportStrPdf('alert-1');
    });

    expect(result.current.exportError).toBe('Export failed');
    expect(result.current.isExporting).toBe(false);
  });

  it('clears previous error before new export', async () => {
    vi.mocked(exportService.downloadCaseFilePdf).mockRejectedValueOnce(
      new Error('First error')
    );
    vi.mocked(exportService.downloadCaseFilePdf).mockResolvedValueOnce(
      new Blob(['ok'])
    );

    const { result } = renderHook(() => useExport());

    /* First call fails */
    await act(async () => {
      await result.current.exportCaseFilePdf('alert-1');
    });
    expect(result.current.exportError).toBe('First error');

    /* Second call succeeds — error should be cleared */
    await act(async () => {
      await result.current.exportCaseFilePdf('alert-1');
    });
    expect(result.current.exportError).toBeNull();
  });

  it('sets correct filename for case file PDF download', async () => {
    vi.mocked(exportService.downloadCaseFilePdf).mockResolvedValue(new Blob(['pdf']));

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportCaseFilePdf('alert-42');
    });

    const createdAnchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results.find(
      (r: { type: string; value: HTMLElement }) => r.value instanceof HTMLAnchorElement
    )?.value as HTMLAnchorElement;
    expect(createdAnchor.download).toBe('case-file-alert-42.pdf');
  });

  it('sets correct filename for STR PDF download', async () => {
    vi.mocked(exportService.downloadStrPdf).mockResolvedValue(new Blob(['str']));

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportStrPdf('alert-77');
    });

    const createdAnchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results.find(
      (r: { type: string; value: HTMLElement }) => r.value instanceof HTMLAnchorElement
    )?.value as HTMLAnchorElement;
    expect(createdAnchor.download).toBe('str-alert-77.pdf');
  });

  it('sets correct filename for analytics CSV download', async () => {
    vi.mocked(exportService.downloadAnalyticsCsv).mockResolvedValue(new Blob(['csv']));

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportAnalyticsCsv();
    });

    const createdAnchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results.find(
      (r: { type: string; value: HTMLElement }) => r.value instanceof HTMLAnchorElement
    )?.value as HTMLAnchorElement;
    expect(createdAnchor.download).toBe('analytics-export.csv');
  });

  it('sets correct filename for bulk SARs ZIP download', async () => {
    vi.mocked(exportService.downloadBulkSars).mockResolvedValue(new Blob(['zip']));

    const { result } = renderHook(() => useExport());

    await act(async () => {
      await result.current.exportBulkSars(['a1']);
    });

    const createdAnchor = (document.createElement as ReturnType<typeof vi.fn>).mock.results.find(
      (r: { type: string; value: HTMLElement }) => r.value instanceof HTMLAnchorElement
    )?.value as HTMLAnchorElement;
    expect(createdAnchor.download).toBe('bulk-sars.zip');
  });
});
