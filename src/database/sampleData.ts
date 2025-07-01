import { TaskRepository } from './taskRepository';

export function createSampleData(taskRepo: TaskRepository) {
  try {
    // Create root tasks
    const projectTask = taskRepo.createTask({
      title: 'プロジェクト管理システム開発',
      description: 'タスク管理アプリケーションの開発',
      status: 'in_progress',
      priority: 'high'
    });

    const designTask = taskRepo.createTask({
      parentId: projectTask.id,
      title: 'UI/UXデザイン',
      description: 'ユーザーインターフェースの設計',
      status: 'completed',
      priority: 'high'
    });

    const devTask = taskRepo.createTask({
      parentId: projectTask.id,
      title: '機能開発',
      description: 'コア機能の実装',
      status: 'in_progress',
      priority: 'high'
    });

    // Add subtasks
    taskRepo.createTask({
      parentId: devTask.id,
      title: 'データベース設計',
      description: 'SQLiteスキーマの設計と実装',
      status: 'completed',
      priority: 'medium'
    });

    taskRepo.createTask({
      parentId: devTask.id,
      title: 'APIエンドポイント実装',
      description: 'RESTful APIの実装',
      status: 'in_progress',
      priority: 'medium'
    });

    taskRepo.createTask({
      parentId: devTask.id,
      title: 'フロントエンド実装',
      description: 'Reactコンポーネントの開発',
      status: 'pending',
      priority: 'medium'
    });

    // Personal tasks
    const personalTask = taskRepo.createTask({
      title: '個人タスク',
      description: '日常のタスク',
      status: 'pending',
      priority: 'low'
    });

    taskRepo.createTask({
      parentId: personalTask.id,
      title: '買い物リスト',
      description: '今週の買い物',
      status: 'pending',
      priority: 'low'
    });

    console.log('Sample data created successfully');
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}