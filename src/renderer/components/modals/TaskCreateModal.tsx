// タスク管理画面からの作成モーダル（ベース仕様）
import React from 'react';
import BaseTaskModal, { BaseTaskModalProps, ModalDisplayConfig, ModalEditConfig, ModalBehaviorConfig } from './BaseTaskModal';

interface TaskCreateModalProps extends Omit<BaseTaskModalProps, 'displayConfig' | 'editConfig' | 'behaviorConfig' | 'isCreating'> {
  // 追加のカスタマイズプロパティがあれば here
}

const TaskCreateModal: React.FC<TaskCreateModalProps> = (props) => {
  const displayConfig: ModalDisplayConfig = {
    showTitle: true,
    showDescription: true,
    showDateTime: true,
    showParentTask: true,
    showStatus: true,
    showPriority: true,
    showSubtasks: false, // 作成時は子タスクなし
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
    showSaveButton: true,
    saveButtonText: 'タスクを作成',
    cancelButtonText: 'キャンセル'
  };

  return (
    <BaseTaskModal
      {...props}
      isCreating={true}
      displayConfig={displayConfig}
      editConfig={editConfig}
      behaviorConfig={behaviorConfig}
    />
  );
};

export default TaskCreateModal;