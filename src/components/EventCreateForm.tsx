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
  const [optionImages, setOptionImages] = useState<FileList | null>(null);
  const [options, setOptions] = useState<Array<{ name: string; option_image_index: number }>>([
    { name: '', option_image_index: -1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const addOption = () =>
    setOptions((prev) => [...prev, { name: '', option_image_index: -1 }]);
  const removeOption = (idx: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  const updateOptionName = (idx: number, val: string) =>
    setOptions((prev) => prev.map((v, i) => (i === idx ? { ...v, name: val } : v)));
  const updateOptionImageIndex = (idx: number, val: number) =>
    setOptions((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, option_image_index: val } : v))
    );

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
    console.debug('[EventCreate] submit fired');
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
      for (const f of Array.from(optionImages ?? [])) {
        imageFiles.push(f);
      }

      // ===== Client-side validation (mirrors README constraints) =====
      const t = title.trim();
      if (t.length < 5 || t.length > 100) {
        throw new Error('제목은 5자 이상 100자 이하여야 합니다.');
      }

      const normalizedOptions = options
        .map((o) => ({
          name: o.name.trim(),
          option_image_index: Number(o.option_image_index),
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
          throw new Error('이벤트 이미지 인덱스가 업로드된 파일 범위를 벗어났습니다.');
        }
      }

      for (const o of normalizedOptions) {
        if (!Number.isInteger(o.option_image_index)) {
          throw new Error('옵션 이미지 인덱스는 정수여야 합니다.');
        }
        if (o.option_image_index < -1) {
          throw new Error('옵션 이미지 인덱스는 -1 또는 0 이상의 값이어야 합니다.');
        }
        // UI expects this to refer to optionImages list; validate that range
        if (o.option_image_index >= 0) {
          const optCount = (optionImages?.length ?? 0);
          if (o.option_image_index >= optCount) {
            throw new Error('옵션 이미지 인덱스가 선택한 옵션 이미지 파일 개수를 초과했습니다.');
          }
        }
      }

      const payload: CreateEventRequest = {
        title: t,
        description: description || undefined,
        start_at: toISO(startAt),
        end_at: toISO(endAt),
        images: images.length > 0 ? images : undefined,
        options: normalizedOptions.map((o) => {
            const idx = o.option_image_index;
            // UI allows -1 for no image, else users reference "option 이미지" file index
            // which begins after the event images in the shared image_files list.
            const mapped = idx < 0 ? -1 : optionImageBaseIndex + idx;
            return { name: o.name, option_image_index: mapped };
          }),
      };

      console.debug('[EventCreate] calling createEvent', {
        title: payload.title,
        start_at: payload.start_at,
        end_at: payload.end_at,
        options_count: payload.options.length,
        image_files_count: imageFiles.length,
      });
      const res = await createEvent({
        ...(payload as any),
        image_files: imageFiles,
      });
      console.debug('[EventCreate] createEvent success', res);
      setMessage('이벤트가 생성되었습니다.');
      setTitle('');
      setDescription('');
      setStartAt('');
      setEndAt('');
      setEventImages(null);
      setOptionImages(null);
      setOptions([{ name: '', option_image_index: -1 }]);
      onCreated?.(res);
    } catch (err) {
      console.error('[EventCreate] create failed', err);
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
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
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
              onChange={(e) => setEndAt(e.target.value)}
              required
            />
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
                onChange={(e) => setEventImages(e.target.files)}
              />
              <p className="page-sub" style={{ margin: 0 }}>
                선택한 순서대로 image_index가 0부터 부여됩니다.
              </p>
            </div>

            <div className="form-row">
              <label htmlFor="opt-images">옵션 이미지 (옵션에서 인덱스로 참조)</label>
              <input
                id="opt-images"
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setOptionImages(e.target.files)}
              />
              <p className="page-sub" style={{ margin: 0 }}>
                아래 옵션의 option_image_index는 여기서 선택한 파일의 0-based 인덱스입니다. (없으면 -1)
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
              <input
                className="input"
                value={opt.option_image_index}
                onChange={(e) => updateOptionImageIndex(idx, Number(e.target.value))}
                placeholder="이미지 인덱스 (-1)"
                inputMode="numeric"
              />
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
