// カレンダーからの編集モーダル
import React from 'react';
import BaseTaskModal, { BaseTaskModalProps, ModalDisplayConfig, ModalEditConfig, ModalBehaviorConfig } from './BaseTaskModal';

interface CalendarTaskEditModalProps extends Omit<BaseTaskModalProps, 'displayConfig' | 'editConfig' | 'behaviorConfig' | 'isCreating'> {
  // カレンダー固有のプロパティがあれば here
}

const CalendarTaskEditModal: React.FC<CalendarTaskEditModalProps> = (props) => {
  const displayConfig: ModalDisplayConfig = {
    showTitle: true,
    showDescription: true,
    showDateTime: true,
    showParentTask: true,  // 通常のタスク編集と同様に表示
    showStatus: true,      // 通常のタスク編集と同様に表示
    showPriority: true,    // 通常のタスク編集と同様に表示
    showSubtasks: true,    // 通常のタスク編集と同様に表示
    showTags: true
  };

  const editConfig: ModalEditConfig = {
    titleAlwaysEditing: true,
    descriptionAlwaysEditing: true,
    enableDateTimeValidation: true
  };

  const behaviorConfig: ModalBehaviorConfig = {
    closeOnBackgroundClick: true,
    closeOnEscape: true,
    showSaveButton: false,  // 通常のタスク編集と同様にリアルタイム保存
    saveButtonText: 'タスクを更新',
    cancelButtonText: 'キャンセル'
  };

  return (
    <BaseTaskModal
      {...props}
      isCreating={false}
      displayConfig={displayConfig}
      editConfig={editConfig}
      behaviorConfig={behaviorConfig}
    />
  );
};

export default CalendarTaskEditModal;