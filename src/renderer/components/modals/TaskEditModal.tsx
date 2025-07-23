// タスク管理画面からの編集モーダル
import React from 'react';
import BaseTaskModal, { BaseTaskModalProps, ModalDisplayConfig, ModalEditConfig, ModalBehaviorConfig } from './BaseTaskModal';

interface TaskEditModalProps extends Omit<BaseTaskModalProps, 'displayConfig' | 'editConfig' | 'behaviorConfig' | 'isCreating'> {
  // 追加のカスタマイズプロパティがあれば here
}

const TaskEditModal: React.FC<TaskEditModalProps> = (props) => {
  const displayConfig: ModalDisplayConfig = {
    showTitle: true,
    showDescription: true,
    showDateTime: true,
    showParentTask: true,
    showStatus: true,
    showPriority: true,
    showSubtasks: true, // 編集時は子タスク表示
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
    showSaveButton: false, // 編集モーダルでは保存ボタンを表示しない
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

export default TaskEditModal;