import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateAptitudeQuestions } from '../services/geminiService';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AppContexts';
import { Question } from '../types';
import { ArrowLeftIcon, ClockIcon, LightbulbIcon } from './Icons';
import DatabaseSetupInstructions from './DatabaseSetupInstructions';

type TestState = 'not-started' | 'loading' | 'in-progress' | 'completed';
type Topic = { name: string; description: string; key: string };

/*
NOTE FOR SUPABASE SETUP:
This component, and others, require specific database tables and functions
to be set up in your Supabase project. If you encounter errors saving scores
or loading data on the dashboard, the app will display the necessary SQL
commands to fix the issue.
*/

const topics: Topic[] = [
    { name: 'Quantitative Aptitude', description: 'Test your numerical and mathematical skills.', key: 'quantitative-aptitude' },
    { name: 'Logical Reasoning', description: 'Assess your problem-solving abilities.', key: 'logical-reasoning' },
    { name: 'Verbal Ability', description: 'Check your command over the English language.', key: 'verbal-ability' },
    { name: 'General Knowledge', description: 'Evaluate your awareness of current affairs.', key: 'general-knowledge' },
    { name: 'Data Interpretation', description: 'Analyze data from charts and graphs.', key: 'data-interpretation' },
];

const Practice: React.FC = () => {
    const { topic: topicKey } = useParams<{ topic: string }>();
    const navigate = useNavigate();
    const { user, setProfile } = useAuth();
    
    const [testState, setTestState] = useState<TestState>('not-started');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<string[]>([]);
    const [showExplanation, setShowExplanation] = useState(false);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [saveError, setSaveError] = useState<string | null>(null);

    const selectedTopic = topics.find(t => t.key === topicKey);

    useEffect(() => {
        if (topicKey && selectedTopic) {
            startTest(selectedTopic.name);
        } else {
            resetTest();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topicKey]);

    useEffect(() => {
        if (testState === 'in-progress' && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
        if (timeLeft === 0 && testState === 'in-progress') {
            handleCompletion();
        }
    }, [timeLeft, testState]);

    const handleCompletion = async () => {
         if (testState === 'completed') return;
         setTestState('completed');

         const score = answers.filter((ans, i) => questions[i] && ans === questions[i].correctAnswer).length;
         setSaveError(null);

        if (selectedTopic && user) {
            try {
                 // 1. Save the raw test result
                const { error: insertError } = await supabase
                    .from('test_results')
                    .insert({
                        user_id: user.id,
                        topic: selectedTopic.name,
                        score: score,
                        total_questions: questions.length
                    });
                if (insertError) throw insertError;
                
                // 2. Increment user's total score
                const pointsEarned = score * 100; // 100 XP per correct answer
                if (pointsEarned > 0) {
                    const { error: rpcError } = await supabase.rpc('increment_user_score', {
                        increment_value: pointsEarned
                    });
                    if (rpcError) throw rpcError;

                    // 3. Update profile context locally for immediate UI update
                    setProfile(prev => prev ? {...prev, score: prev.score + pointsEarned} : null);
                }

            } catch (e: any) {
                console.error("Failed to save performance data", e);
                setSaveError(e.message);
            }
        }
    }
    
    const startTest = async (topicName: string) => {
        setTestState('loading');
        setSaveError(null);
        const fetchedQuestions = await generateAptitudeQuestions(topicName, 5);
        if (fetchedQuestions.length > 0) {
            setQuestions(fetchedQuestions);
            setAnswers(new Array(fetchedQuestions.length).fill(null));
            setCurrentQuestionIndex(0);
            setShowExplanation(false);
            setTimeLeft(300);
            setTestState('in-progress');
        } else {
            // Handle error case
            setTestState('not-started');
            alert("Could not load questions. Please try again.");
            navigate('/practice');
        }
    };

    const handleAnswer = (option: string) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = option;
        setAnswers(newAnswers);
        setShowExplanation(true);
    };

    const goToNextQuestion = () => {
        setShowExplanation(false);
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            handleCompletion();
        }
    };
    
    const resetTest = () => {
        setTestState('not-started');
        setQuestions([]);
        navigate('/practice');
    }

    if (!topicKey || !selectedTopic) {
        return <TopicSelection />;
    }

    if (testState === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-t-transparent border-fire-orange-start rounded-full animate-spin"></div>
                <p className="mt-4 text-lg">Generating your test...</p>
            </div>
        );
    }

    if (testState === 'completed') {
        const score = answers.filter((ans, i) => ans === questions[i].correctAnswer).length;
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg animate-fade-in text-center">
                <h2 className="text-3xl font-bold text-fire-orange-start mb-4">Test Completed!</h2>
                <p className="text-xl mb-2">You scored:</p>
                <p className="text-5xl font-bold mb-2">{score} / {questions.length}</p>
                {saveError ? (
                    <div className="my-6">
                       <DatabaseSetupInstructions feature="weekly_progress" error={saveError} />
                    </div>
                ) : (
                    <p className="text-lg font-semibold text-green-500 mb-6">+{score * 100} XP Earned</p>
                )}
                <button onClick={resetTest} className="px-6 py-2 font-semibold text-white bg-gradient-to-r from-fire-orange-start to-fire-red-end rounded-lg hover:opacity-90 transition-opacity">
                    Take Another Test
                </button>
            </div>
        );
    }

    if (testState === 'in-progress' && questions.length > 0) {
        const currentQuestion = questions[currentQuestionIndex];
        return (
            <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={resetTest} className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
                        <ArrowLeftIcon />
                        <span className="ml-2">Back to Topics</span>
                    </button>
                    <div className="flex items-center text-lg font-semibold text-fire-red-end">
                        <ClockIcon />
                        <span className="ml-2">{Math.floor(timeLeft / 60)}:{('0' + timeLeft % 60).slice(-2)}</span>
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Question {currentQuestionIndex + 1} of {questions.length}</p>
                    <p className="text-xl font-semibold mt-1">{currentQuestion.question}</p>
                </div>

                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                        const isSelected = answers[currentQuestionIndex] === option;
                        const isCorrect = currentQuestion.correctAnswer === option;
                        let buttonClass = 'border-gray-300 dark:border-gray-600 hover:border-fire-orange-start hover:bg-orange-50 dark:hover:bg-gray-700';
                        if (showExplanation) {
                            if (isCorrect) {
                                buttonClass = 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
                            } else if (isSelected && !isCorrect) {
                                buttonClass = 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
                            }
                        } else if (isSelected) {
                             buttonClass = 'border-fire-orange-start bg-orange-100 dark:bg-gray-700 dark:border-fire-orange-start';
                        }
                        return (
                            <button
                                key={index}
                                onClick={() => handleAnswer(option)}
                                disabled={showExplanation}
                                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${buttonClass}`}
                            >
                                {option}
                            </button>
                        )
                    })}
                </div>

                {showExplanation && (
                    <div className="mt-6 p-4 bg-orange-50 dark:bg-gray-700/50 rounded-lg animate-fade-in">
                        <div className="flex items-start">
                            <LightbulbIcon className="text-yellow-500 mt-1" />
                            <div className="ml-3">
                                <h3 className="font-bold">Explanation</h3>
                                <p className="text-sm mt-1">{currentQuestion.explanation}</p>
                            </div>
                        </div>
                        <button onClick={goToNextQuestion} className="mt-4 w-full px-6 py-2 font-semibold text-white bg-gradient-to-r from-fire-orange-start to-fire-red-end rounded-lg hover:opacity-90 transition-opacity">
                            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Test'}
                        </button>
                    </div>
                )}
            </div>
        );
    }
    
    return null;
};

const TopicSelection: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-6">Choose a Topic to Practice</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map(topic => (
                    <div key={topic.key} className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all transform cursor-pointer" onClick={() => navigate(`/practice/${topic.key}`)}>
                        <h2 className="text-xl font-bold text-fire-orange-start">{topic.name}</h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">{topic.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Practice;
