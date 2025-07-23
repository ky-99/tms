// カレンダーからの作成モーダル
import React from 'react';
import BaseTaskModal, { BaseTaskModalProps, ModalDisplayConfig, ModalEditConfig, ModalBehaviorConfig } from './BaseTaskModal';

interface CalendarTaskCreateModalProps extends Omit<BaseTaskModalProps, 'displayConfig' | 'editConfig' | 'behaviorConfig' | 'isCreating'> {
  // カレンダー固有のプロパティ
  selectedDate?: string; // カレンダーで選択された日付
}

const CalendarTaskCreateModal: React.FC<CalendarTaskCreateModalProps> = ({ selectedDate, ...props }) => {
  const displayConfig: ModalDisplayConfig = {
    showTitle: true,
    showDescription: true,
    showDateTime: true,
    showParentTask: true,  // 親タスク選択を有効化
    showStatus: false,     // カレンダーでは簡素化
    showPriority: false,   // カレンダーでは簡素化
    showSubtasks: false,
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
    saveButtonText: 'イベントを作成',
    cancelButtonText: 'キャンセル'
  };

  // ViewsPageからのdefaultValuesを優先し、selectedDateは使用しない
  // （ViewsPageがhandleCreateTaskで適切にdefaultEndDateを設定している）
  const defaultValues = props.defaultValues || {};
  

  return (
    <BaseTaskModal
      {...props}
      isCreating={true}
      defaultValues={defaultValues}
      displayConfig={displayConfig}
      editConfig={editConfig}
      behaviorConfig={behaviorConfig}
      hideTimeWhenDateOnly={false}
    />
  );
};

export default CalendarTaskCreateModal;