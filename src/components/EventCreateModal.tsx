import EventCreateForm from './EventCreateForm';
import type { CreateEventResponse } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (ev: CreateEventResponse) => void;
}

const EventCreateModal = ({ open, onClose, onCreated }: Props) => {
  if (!open) return null;
  const handleOverlayClick = () => onClose();
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal" onClick={stop}>
        <header className="modal-header">
          <h3>이벤트 생성</h3>
        </header>
        <EventCreateForm
          onCreated={(ev) => {
            onCreated?.(ev);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};

export default EventCreateModal;
