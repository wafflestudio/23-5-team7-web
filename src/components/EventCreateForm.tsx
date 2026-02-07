import { useState } from 'react';
import { createEvent } from '../api/events';
import type { CreateEventRequest, CreateEventResponse } from '../types';

interface Props {
  onCreated?: (ev: CreateEventResponse) => void;
  onCancel?: () => void;
}

const EventCreateForm = ({ onCreated, onCancel }: Props) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(''); // datetime-local
  const [endAt, setEndAt] = useState(''); // datetime-local
  const [eventImages, setEventImages] = useState<FileList | null>(null);
  const [options, setOptions] = useState<
    Array<{ name: string; option_image_files: File[] }>
  >([{ name: '', option_image_files: [] }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // README 2-1: per-image size limit 5MB
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  const describeTooLarge = (files: File[]) => {
    const over = files.filter((f) => f.size > MAX_IMAGE_BYTES);
    if (over.length === 0) return null;
    const names = over
      .slice(0, 3)
      .map((f) => f.name)
      .join(', ');
    const more = over.length > 3 ? ` 외 ${over.length - 3}개` : '';
    return `이미지 용량이 너무 커요. (개별 5MB 이하) : ${names}${more}`;
  };

  const nowLocal = new Date();
  const minStartLocal = new Date(nowLocal.getTime() + 60_000)
    .toISOString()
    .slice(0, 16);

  const fmtLocal = (dtLocal: string) => {
    if (!dtLocal) return '';
    // Convert yyyy-mm-ddThh:mm to a readable label in ko-KR.
    try {
      const d = new Date(dtLocal);
      return d.toLocaleString('ko-KR');
    } catch {
      return dtLocal;
    }
  };

  const addOption = () =>
    setOptions((prev) => [...prev, { name: '', option_image_files: [] }]);
  const removeOption = (idx: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  const updateOptionName = (idx: number, val: string) =>
    setOptions((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, name: val } : v))
    );

  const setOptionImage = (idx: number, file: File | null) => {
    setOptions((prev) =>
      prev.map((v, i) =>
        i === idx
          ? {
              ...v,
              option_image_files: file ? [file] : [],
            }
          : v
      )
    );
  };

  const clearOptionImages = (idx: number) => {
    setOptions((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, option_image_files: [] } : v))
    );
  };

  const toISO = (dt: string) => {
    // NOTE: <input type="datetime-local"> gives a local datetime string like "2026-01-17T20:30".
    // Some backends reject ISO 8601 with a timezone designator (e.g. trailing 'Z').
    // We send a "naive" datetime string without timezone: "YYYY-MM-DDTHH:mm:ss".
    if (!dt) return '';
    // Ensure seconds are present (datetime-local may omit them).
    return dt.length === 16 ? `${dt}:00` : dt;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (import.meta.env.DEV) {
      // biome-ignore lint/suspicious/noConsole: dev-only trace
      console.debug('[EventCreate] submit fired');
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token || token.trim().length === 0) {
        throw new Error('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
      }

      const imageFiles: File[] = [];
      const images: Array<{ image_index: number }> = [];

      // Event images come first: image_index points into this shared image_files list
      for (const f of Array.from(eventImages ?? [])) {
        images.push({ image_index: imageFiles.length });
        imageFiles.push(f);
      }

      const optionImageBaseIndex = imageFiles.length;
      // Flatten option images in option order.
      // API supports a single option_image_index per option, so only the first selected image is appended.
      for (const opt of options) {
        const first = (opt.option_image_files ?? [])[0];
        if (first) imageFiles.push(first);
      }

      // ===== Client-side validation (mirrors README constraints) =====
      const t = title.trim();
      if (t.length < 5 || t.length > 100) {
        throw new Error('제목은 5자 이상 100자 이하여야 합니다.');
      }

      const normalizedOptions = options
        .map((o) => ({
          name: o.name.trim(),
          option_image_files: o.option_image_files ?? [],
        }))
        .filter((o) => o.name.length > 0);

      if (normalizedOptions.length < 2 || normalizedOptions.length > 10) {
        throw new Error('옵션은 2개 이상 10개 이하로 입력해주세요.');
      }

      for (const o of normalizedOptions) {
        if (o.name.length < 1 || o.name.length > 50) {
          throw new Error('옵션 이름은 1자 이상 50자 이하여야 합니다.');
        }
      }

      const nameSet = new Set<string>();
      for (const o of normalizedOptions) {
        // case-sensitive uniqueness is usually fine; backend will enforce too
        if (nameSet.has(o.name)) {
          throw new Error('옵션 이름이 중복되었습니다. 각각 고유해야 합니다.');
        }
        nameSet.add(o.name);
      }

      // Validate image index bounds
      const maxIndex = imageFiles.length - 1;
      for (const img of images) {
        if (img.image_index < 0 || img.image_index > maxIndex) {
          throw new Error(
            '이벤트 이미지 인덱스가 업로드된 파일 범위를 벗어났습니다.'
          );
        }
      }

      // Calculate per-option image index mapping (shared image_files array)
      let runningOptImageIndex = optionImageBaseIndex;

      const payload: CreateEventRequest = {
        title: t,
        description: description || undefined,
        start_at: toISO(startAt),
        end_at: toISO(endAt),
        images: images.length > 0 ? images : undefined,
        options: normalizedOptions.map((o) => {
          // If no image for this option, -1. Otherwise map to shared image_files index.
          const hasImage = (o.option_image_files ?? []).length > 0;
          const mapped = hasImage ? runningOptImageIndex : -1;

          // We appended at most 1 file per option above.
          if (hasImage) runningOptImageIndex += 1;

          return { name: o.name, option_image_index: mapped };
        }),
      };

      if (import.meta.env.DEV) {
        // biome-ignore lint/suspicious/noConsole: dev-only trace
        console.debug('[EventCreate] calling createEvent', {
          title: payload.title,
          start_at: payload.start_at,
          end_at: payload.end_at,
          options_count: payload.options.length,
          image_files_count: imageFiles.length,
        });
      }
      const res = await createEvent({
        ...payload,
        image_files: imageFiles,
      } as CreateEventRequest & { image_files: File[] });
      if (import.meta.env.DEV) {
        // biome-ignore lint/suspicious/noConsole: dev-only trace
        console.debug('[EventCreate] createEvent success', res);
      }
      setMessage('이벤트가 생성되었습니다.');
      setTitle('');
      setDescription('');
      setStartAt('');
      setEndAt('');
      setEventImages(null);
      setOptions([{ name: '', option_image_files: [] }]);
      onCreated?.(res);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[EventCreate] create failed', err);
      }
      const msg = err instanceof Error ? err.message : '이벤트 생성 실패';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="modal-body">
        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="ev-title">제목</label>
            <input
              id="ev-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="공대 vs 자연대 축구"
            />
          </div>
          <div className="form-row">
            <label htmlFor="ev-start">시작 시각</label>
            <input
              id="ev-start"
              className="input"
              type="datetime-local"
              value={startAt}
              min={minStartLocal}
              onChange={(e) => {
                const next = e.target.value;
                setStartAt(next);
                // As requested: when start time changes, reset end time selection.
                setEndAt('');
              }}
              required
            />
            <p className="page-sub" style={{ margin: 0 }}>
              현재 시각 기준 1분 이후부터 선택할 수 있어요.
              {minStartLocal ? ` (최소: ${fmtLocal(minStartLocal)})` : ''}
            </p>
          </div>
          <div className="form-row">
            <label htmlFor="ev-desc">설명</label>
            <textarea
              id="ev-desc"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="관악의 주인 결정전"
              rows={3}
            />
          </div>
          <div className="form-row">
            <label htmlFor="ev-end">종료 시각</label>
            <input
              id="ev-end"
              className="input"
              type="datetime-local"
              value={endAt}
              min={startAt || minStartLocal}
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
            <p className="page-sub" style={{ margin: 0 }}>
              시작 시각 이후로만 선택할 수 있어요.
            </p>
          </div>

          <div className="image-input-grid span-2">
            <div className="form-row">
              <label htmlFor="ev-images">이벤트 이미지 (0개 이상)</label>
              <input
                id="ev-images"
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  const tooLargeMsg = describeTooLarge(files);
                  if (tooLargeMsg) {
                    setError(tooLargeMsg);
                    setEventImages(null);
                    // reset input so user can reselect
                    e.currentTarget.value = '';
                    return;
                  }
                  setError(null);
                  setEventImages(e.target.files);
                }}
              />
              <p className="page-sub" style={{ margin: 0 }}>
                이미지 파일은 개별 5MB 이하만 업로드할 수 있어요.
              </p>
            </div>

            <div className="form-row">
              <label>옵션 이미지</label>
              <p className="page-sub" style={{ margin: 0 }}>
                각 옵션마다 이미지는 1장만 선택할 수 있어요. (없으면 이미지 없이
                생성됩니다.)
              </p>
            </div>
          </div>
        </div>
        <div className="form-row">
          <label>옵션</label>
          {options.map((opt, idx) => (
            <div key={idx} className="option-row" style={{ marginBottom: 6 }}>
              <input
                className="input"
                value={opt.name}
                onChange={(e) => updateOptionName(idx, e.target.value)}
                placeholder={`옵션 ${idx + 1}`}
              />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label
                  className="button"
                  style={{ margin: 0, cursor: 'pointer' }}
                >
                  이미지 선택
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file) {
                        const tooLargeMsg = describeTooLarge([file]);
                        if (tooLargeMsg) {
                          setError(tooLargeMsg);
                          setOptionImage(idx, null);
                          e.currentTarget.value = '';
                          return;
                        }
                        setError(null);
                      }

                      setOptionImage(idx, file);
                      // reset input so selecting same file again triggers change
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                <small className="page-sub" style={{ margin: 0 }}>
                  {opt.option_image_files.length > 0 ? '선택됨' : '없음'}
                </small>
                {opt.option_image_files.length > 0 ? (
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => clearOptionImages(idx)}
                  >
                    제거
                  </button>
                ) : null}
              </div>
              <button
                className="button"
                type="button"
                onClick={() => removeOption(idx)}
                disabled={options.length <= 1}
              >
                삭제
              </button>
            </div>
          ))}
          <button type="button" className="button" onClick={addOption}>
            옵션 추가
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-info">{message}</p>}
      </div>
      <footer className="modal-footer">
        <button type="button" className="button" onClick={onCancel}>
          취소
        </button>
        <button className="button primary" type="submit" disabled={loading}>
          {loading ? '생성 중…' : '이벤트 생성'}
        </button>
      </footer>
    </form>
  );
};

export default EventCreateForm;
