import { addDays, format } from 'date-fns'
import type {
  CPRecord,
  Course,
  CourseDay,
  DataState,
  GitHubContribution,
  Goal,
  Habit,
  LeetCodeRecord,
  Project,
  StudySession,
  Subject,
  Task,
  Video,
} from '@/types'
import { uid } from './id'
import { DATE_KEY, todayKey } from './date'

const YT = (query: string): string =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`

const ML_CURRICULUM: Array<[string, string[]]> = [
  ['Introduction to Machine Learning', ['What is Machine Learning?', 'Supervised, Unsupervised & Reinforcement Learning', 'The End-to-End ML Workflow']],
  ['Python for ML: NumPy', ['NumPy Arrays & Broadcasting', 'Vectorised Operations', 'Hands-on: Linear Algebra with NumPy']],
  ['Data Analysis with Pandas', ['Series & DataFrames', 'Cleaning & Reshaping Data', 'GroupBy & Aggregation']],
  ['Data Visualisation', ['Matplotlib Fundamentals', 'Seaborn Statistical Plots', 'Telling a Story with Data']],
  ['Linear Algebra for ML', ['Vectors & Matrices', 'Matrix Multiplication & Inverses', 'Eigenvalues & SVD']],
  ['Probability & Statistics', ['Probability Distributions', 'Bayes Theorem Intuition', 'Hypothesis Testing']],
  ['Data Preprocessing', ['Handling Missing Values', 'Encoding Categorical Features', 'Feature Scaling']],
  ['Feature Engineering', ['Feature Selection', 'Creating Interaction Features', 'Handling Imbalanced Data']],
  ['Model Validation', ['Train/Test Split', 'K-Fold Cross-Validation', 'Bias–Variance Tradeoff']],
  ['Linear Regression', ['Simple Linear Regression', 'Multiple Linear Regression', 'Assumptions & Diagnostics']],
  ['Gradient Descent', ['The Cost Function', 'Batch vs Stochastic GD', 'Learning Rate Tuning']],
  ['Logistic Regression', ['The Sigmoid Function', 'Decision Boundaries', 'Multiclass with Softmax']],
  ['Regularisation', ['Ridge (L2)', 'Lasso (L1) & Feature Selection', 'Elastic Net']],
  ['Evaluation Metrics', ['Accuracy, Precision & Recall', 'ROC-AUC', 'Confusion Matrix Deep Dive']],
  ['K-Nearest Neighbours', ['Distance Metrics', 'Choosing K', 'Curse of Dimensionality']],
  ['Naive Bayes', ['The Naive Assumption', 'Text Classification with NB', 'When NB Works Best']],
  ['Decision Trees', ['Entropy & Information Gain', 'Gini Impurity', 'Pruning Trees']],
  ['Ensembles & Random Forests', ['Bagging', 'Random Forests', 'Feature Importance']],
  ['Gradient Boosting', ['AdaBoost', 'XGBoost in Practice', 'LightGBM & CatBoost']],
  ['Support Vector Machines', ['Maximum Margin Classifier', 'The Kernel Trick', 'Tuning C & Gamma']],
  ['Unsupervised Learning: Clustering', ['K-Means Algorithm', 'Choosing Cluster Count', 'Hierarchical Clustering']],
  ['Dimensionality Reduction', ['Principal Component Analysis', 't-SNE Visualisation', 'Autoencoders Preview']],
  ['Anomaly Detection', ['Gaussian Anomaly Detection', 'Isolation Forest', 'Applications & Pitfalls']],
  ['Neural Networks Fundamentals', ['The Perceptron', 'Activation Functions', 'Backpropagation by Hand']],
  ['Deep Learning with PyTorch', ['Tensors & Autograd', 'Building a Network', 'Training Loops & DataLoaders']],
  ['Convolutional Neural Networks', ['Convolution & Pooling', 'CNN Architectures', 'Transfer Learning']],
  ['Sequence Models', ['RNNs & Vanishing Gradients', 'LSTMs & GRUs', 'Attention Mechanism']],
  ['Natural Language Processing', ['Tokenisation & Embeddings', 'Text Classification Pipeline', 'Transformers Overview']],
  ['Model Deployment & MLOps', ['Saving & Serving Models', 'Monitoring in Production', 'CI/CD for ML']],
  ['Capstone Project', ['Problem Framing', 'Building the Pipeline', 'Presenting Results']],
]

const buildVideos = (topics: string[], dayIndex: number): Video[] =>
  topics.map((title, i) => ({
    id: uid(),
    title,
    url: YT(`machine learning ${title}`),
    duration: 9 + ((dayIndex * 3 + i) * 7) % 26,
    completed: false,
    completedAt: null,
  }))

export const buildDemoCourse = (): Course => ({
  id: uid(),
  title: 'Machine Learning',
  description:
    'A complete 30-day road map from the fundamentals of machine learning to deploying models in production.',
  category: 'AI / ML',
  color: '#6366f1',
  createdAt: new Date().toISOString(),
  days: ML_CURRICULUM.map(([title, topics], index): CourseDay => ({
    id: uid(),
    title,
    description: topics.join(' · '),
    order: index + 1,
    videos: buildVideos(topics, index),
    codeFiles: [],
  })),
})

export const buildSeedData = (): DataState => {
  const today = new Date()
  const day = (offset: number): string => format(addDays(today, offset), DATE_KEY)

  const ml = buildDemoCourse()

  const subjects: Subject[] = [
    { id: uid(), name: 'Machine Learning', color: '#6366f1', createdAt: new Date().toISOString() },
    { id: uid(), name: 'Data Structures & Algorithms', color: '#10b981', createdAt: new Date().toISOString() },
    { id: uid(), name: 'Operating Systems', color: '#f59e0b', createdAt: new Date().toISOString() },
  ]

  const habits: Habit[] = [
    {
      id: uid(),
      name: 'Deep work',
      description: 'Two focused hours with no distractions',
      color: '#6366f1',
      frequency: 'daily',
      targetPerPeriod: 1,
      completions: [day(-1), day(-2), day(-3), day(-4), day(-6)],
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      name: 'Solve a coding problem',
      description: 'Keep the problem-solving muscle warm',
      color: '#10b981',
      frequency: 'weekly',
      targetPerPeriod: 5,
      completions: [day(-1), day(-2), day(-4), day(-5), day(-8)],
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      name: 'Read 20 pages',
      description: 'Technical or non-fiction',
      color: '#f59e0b',
      frequency: 'daily',
      targetPerPeriod: 1,
      completions: [day(-2), day(-3)],
      createdAt: new Date().toISOString(),
    },
  ]

  const projects: Project[] = [
    {
      id: uid(),
      name: 'Personal OS',
      description: 'This app — a single dashboard for tasks, habits, learning and coding practice.',
      status: 'active',
      techStack: ['React', 'TypeScript', 'Tailwind', 'Zustand'],
      repoUrl: '',
      liveUrl: '',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      name: 'Portfolio site',
      description: 'Personal portfolio with project write-ups and a blog.',
      status: 'idea',
      techStack: ['Next.js', 'MDX'],
      repoUrl: '',
      liveUrl: '',
      createdAt: new Date().toISOString(),
    },
  ]

  const goals: Goal[] = [
    {
      id: uid(),
      title: 'Finish the Machine Learning course',
      description: 'Complete every video and ship the capstone project.',
      category: 'Learning',
      targetDate: day(45),
      status: 'active',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      title: 'Solve 150 LeetCode problems',
      description: 'Focus on arrays, graphs and dynamic programming.',
      category: 'Career',
      targetDate: day(90),
      status: 'active',
      createdAt: new Date().toISOString(),
    },
  ]

  const tasks: Task[] = [
    {
      id: uid(),
      title: 'Review ML Day 1 notes',
      description: 'Summarise the difference between supervised and unsupervised learning.',
      completed: false,
      priority: 'high',
      tags: ['ml', 'study'],
      dueDate: todayKey(),
      goalIds: [goals[0].id],
      projectId: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    },
    {
      id: uid(),
      title: 'Solve two array problems',
      description: 'Two pointers and sliding window patterns.',
      completed: false,
      priority: 'medium',
      tags: ['dsa', 'leetcode'],
      dueDate: day(1),
      goalIds: [goals[1].id],
      projectId: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    },
    {
      id: uid(),
      title: 'Plan Personal OS roadmap',
      description: 'Decide which modules ship first.',
      completed: true,
      priority: 'urgent',
      tags: ['planning'],
      dueDate: day(-1),
      goalIds: [],
      projectId: projects[0].id,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  ]

  const studySessions: StudySession[] = [
    { id: uid(), subjectId: subjects[0].id, date: day(-1), minutes: 90, notes: 'Watched the ML intro series.', createdAt: new Date().toISOString() },
    { id: uid(), subjectId: subjects[1].id, date: day(-1), minutes: 45, notes: 'Two-pointer problems.', createdAt: new Date().toISOString() },
    { id: uid(), subjectId: subjects[2].id, date: day(-2), minutes: 60, notes: 'Process scheduling.', createdAt: new Date().toISOString() },
    { id: uid(), subjectId: subjects[0].id, date: day(-3), minutes: 120, notes: 'NumPy practice.', createdAt: new Date().toISOString() },
  ]

  const leetcode: LeetCodeRecord[] = [
    { id: uid(), title: 'Two Sum', difficulty: 'Easy', topics: ['Array', 'Hash Table'], status: 'solved', url: 'https://leetcode.com/problems/two-sum/', date: day(-1), notes: 'Hash map one-pass.', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium', topics: ['Sliding Window'], status: 'solved', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', date: day(-2), notes: 'Sliding window with set.', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Merge k Sorted Lists', difficulty: 'Hard', topics: ['Heap', 'Linked List'], status: 'review', url: 'https://leetcode.com/problems/merge-k-sorted-lists/', date: day(-2), notes: 'Revisit with divide and conquer.', createdAt: new Date().toISOString() },
  ]

  const cp: CPRecord[] = [
    { id: uid(), platform: 'Codeforces', title: 'Round 950 Div 3 — Problem C', rating: 1200, topic: 'Greedy', status: 'solved', url: 'https://codeforces.com/problemset', date: day(-2), notes: 'Missed the observation first time.', createdAt: new Date().toISOString() },
    { id: uid(), platform: 'CodeChef', title: 'Starters 142 — Problem B', rating: 1100, topic: 'Math', status: 'todo', url: 'https://www.codechef.com/problems', date: day(1), notes: '', createdAt: new Date().toISOString() },
  ]

  const github: GitHubContribution[] = [
    { id: uid(), repo: 'personal-os', date: day(-1), commits: 4, prs: 1, issues: 2, notes: 'Store + persistence layer.', createdAt: new Date().toISOString() },
    { id: uid(), repo: 'algorithms', date: day(-2), commits: 2, prs: 0, issues: 0, notes: 'Sliding window solutions.', createdAt: new Date().toISOString() },
    { id: uid(), repo: 'personal-os', date: day(-4), commits: 3, prs: 0, issues: 1, notes: 'Scaffolding.', createdAt: new Date().toISOString() },
  ]

  return {
    profile: { name: 'My Personal OS', tagline: 'Learn · Build · Track' },
    settings: { theme: 'system', weekStartsOn: 1 },
    tasks,
    habits,
    courses: [ml],
    subjects,
    studySessions,
    workouts: [],
    notes: [],
    leetcode,
    cp,
    github,
    projects,
    goals,
  }
}
