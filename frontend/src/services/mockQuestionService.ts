import { Question } from '../components/QuestionRenderer';

export const mockCalculusQuestions: Question[] = [
  {
    id: 'mock-1',
    problemNumber: 1,
    questionText: 'What is the derivative of f(x) = 3x² + 5x - 2?',
    questionType: 'mcq',
    correctAnswer: '6x + 5',
    choices: [
      '3x + 5',
      '6x + 5',
      '6x² + 5',
      '3x² + 5'
    ],
    explanation: 'To find the derivative, apply the power rule: d/dx(3x²) = 6x, d/dx(5x) = 5, and d/dx(-2) = 0. Therefore, f′(x) = 6x + 5.'
  },
  {
    id: 'mock-2',
    problemNumber: 2,
    questionText: 'The limit of (sin x)/x as x approaches 0 equals 1.',
    questionType: 'tf',
    correctAnswer: true,
    explanation: 'This is a fundamental limit in calculus, often proven using L\'Hôpital\'s Rule or the squeeze theorem. As x approaches 0, sin(x)/x approaches 1.'
  },
  {
    id: 'mock-3',
    problemNumber: 3,
    questionText: 'Evaluate the definite integral: ∫₀² (2x + 1) dx',
    questionType: 'numeric',
    correctAnswer: 6,
    explanation: 'Find the antiderivative: ∫(2x + 1) dx = x² + x + C. Evaluate from 0 to 2: (2² + 2) - (0² + 0) = 6 - 0 = 6.'
  },
  {
    id: 'mock-4',
    problemNumber: 4,
    questionText: 'The second derivative of f is called the _____ derivative.',
    questionType: 'fib',
    correctAnswer: 'second',
    explanation: 'The second derivative is simply the derivative of the first derivative, often denoted as f″ or d²f/dx².'
  },
  {
    id: 'mock-5',
    problemNumber: 5,
    questionText: 'Match each calculus concept with its description:',
    questionType: 'matching',
    left: ['Derivative', 'Integral', 'Limit'],
    right: [
      'The rate of change of a function',
      'The area under a curve',
      'The value a function approaches as input approaches some value'
    ],
    correctAnswer: [[0, 0], [1, 1], [2, 2]],
    explanation: 'Derivatives measure instantaneous rates of change, integrals compute the accumulation (like area under curves), and limits describe the behavior of functions as inputs approach specific values.'
  },
  {
    id: 'mock-6',
    problemNumber: 6,
    questionText: 'Order the following steps to find the derivative of a composite function using the chain rule:',
    questionType: 'ordering',
    choices: [
      'Identify the inner and outer functions',
      'Differentiate the outer function',
      'Multiply by the derivative of the inner function',
      'Simplify the result'
    ],
    correctAnswer: [
      'Identify the inner and outer functions',
      'Differentiate the outer function',
      'Multiply by the derivative of the inner function',
      'Simplify the result'
    ],
    explanation: 'The chain rule states: (f(g(x)))′ = f′(g(x)) · g′(x). First identify the functions, then apply the rule by taking the outer derivative and multiplying by the inner derivative.'
  },
  {
    id: 'mock-7',
    problemNumber: 7,
    questionText: 'Explain how to use integration by parts to solve ∫ x·eˣ dx. Show your work step-by-step.',
    questionType: 'fr',
    correctAnswer: 'Integration by parts uses the formula ∫udv = uv - ∫vdu. Let u = x and dv = eˣ dx, then du = dx and v = eˣ. The result is xeˣ - eˣ + C.',
    points: 10,
    rubric: 'Student should identify u and dv, find du and v, apply the integration by parts formula, and include the constant of integration.',
    explanation: 'Integration by parts is based on the product rule for derivatives. Choose u to be the part that simplifies when differentiated (here, x), and dv to be easily integrable (here, eˣ). After applying the formula ∫udv = uv - ∫vdu, you get xeˣ - eˣ + C.'
  }
];

export const createMockSession = (): string => {
  const sessionId = `mock-session-${Date.now()}`;
  // Store mock questions in sessionStorage for retrieval
  sessionStorage.setItem(`mock-questions-${sessionId}`, JSON.stringify(mockCalculusQuestions));
  return sessionId;
};

export const getMockQuestions = (sessionId: string): Question[] => {
  const stored = sessionStorage.getItem(`mock-questions-${sessionId}`);
  if (stored) {
    return JSON.parse(stored);
  }
  return mockCalculusQuestions;
};
