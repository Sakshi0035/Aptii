import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicIcon, MicOffIcon, Volume2Icon, XIcon, ClockIcon } from './Icons';
import { generateVoiceTestQuestions, evaluateSpokenAnswer } from '../services/geminiService';
import { VoiceQuestion } from '../types';

type TestPhase = 'setup' | 'loading' | 'in-progress' | 'evaluating' | 'finished';

const QUESTION_TIME_LIMIT = 30; // 30 seconds per question

const VoiceTest: React.FC = () => {
    // Test setup state
    const [topic, setTopic] = useState('Quantitative Aptitude');
    const [difficulty, setDifficulty] = useState('Medium');
    const [questionCount, setQuestionCount] = useState(5);
    
    // Test execution state
    const [phase, setPhase] = useState<TestPhase>('setup');
    const [questions, setQuestions] = useState<VoiceQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showConfirmEndModal, setShowConfirmEndModal] = useState(false);

    // Speech recognition state
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isTranscriptFinal, setIsTranscriptFinal] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<{isCorrect: boolean, feedback: string} | null>(null);

    // Timer state
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
    const timerIntervalRef = useRef<number | null>(null);

    const recognitionRef = useRef<any>(null);

    const stopTimer = useCallback(() => {
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }, []);

    const handleTimeUp = useCallback(() => {
        stopTimer();
        if (recognitionRef.current && isListening) {
            recognitionRef.current.stop();
        }
        setPhase('evaluating');
        setEvaluationResult({ isCorrect: false, feedback: "Time's up! You need to be quicker." });
        setPhase('in-progress');
    }, [isListening, stopTimer]);

    const startTimer = useCallback(() => {
        stopTimer();
        setTimeLeft(QUESTION_TIME_LIMIT);
        timerIntervalRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [stopTimer, handleTimeUp]);

    const handleAnswerSubmission = useCallback(async (spokenAnswer: string) => {
        stopTimer();
        setPhase('evaluating');
        const currentQuestion = questions[currentQuestionIndex];
        const result = await evaluateSpokenAnswer(currentQuestion.question, currentQuestion.answer, spokenAnswer);
        setEvaluationResult(result);
        if (result.isCorrect) {
            setScore(s => s + 1);
        }
        setPhase('in-progress');
    }, [questions, currentQuestionIndex, stopTimer]);

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Speech Recognition API not supported in this browser.");
            return;
        }
        
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        recognition.continuous = false;
        recognition.interimResults = true; // Enable interim results for real-time feedback
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(finalTranscript || interimTranscript);
            setIsTranscriptFinal(!!finalTranscript);
            if (finalTranscript) {
                handleAnswerSubmission(finalTranscript.trim());
            }
        };
    }, [handleAnswerSubmission]);
    
    const speak = useCallback((text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onend = () => {
            startTimer();
        };
        window.speechSynthesis.speak(utterance);
    }, [startTimer]);

    // Auto-speak question
    useEffect(() => {
        if (phase === 'in-progress' && questions.length > 0 && !evaluationResult) {
            speak(questions[currentQuestionIndex].question);
        }
    }, [currentQuestionIndex, phase, questions, speak, evaluationResult]);

    const startTest = async () => {
        setPhase('loading');
        const fetchedQuestions = await generateVoiceTestQuestions(topic, difficulty, questionCount);
        if (fetchedQuestions && fetchedQuestions.length > 0) {
            setQuestions(fetchedQuestions);
            setCurrentQuestionIndex(0);
            setScore(0);
            setTranscript('');
            setIsTranscriptFinal(false);
            setEvaluationResult(null);
            setPhase('in-progress');
        } else {
            alert('Failed to generate questions. Please try again.');
            setPhase('setup');
        }
    };
    
    const toggleListening = () => {
        if (!recognitionRef.current || isListening || evaluationResult || timeLeft === 0) return;
        setTranscript('');
        setIsTranscriptFinal(false);
        setEvaluationResult(null);
        window.speechSynthesis.cancel();
        recognitionRef.current.start();
    };
    
    const goToNextQuestion = () => {
        setTranscript('');
        setIsTranscriptFinal(false);
        setEvaluationResult(null);
        stopTimer();
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
        } else {
            setPhase('finished');
        }
    };
    
    const retryQuestion = () => {
        setTranscript('');
        setIsTranscriptFinal(false);
        setEvaluationResult(null);
        startTimer();
        if (recognitionRef.current && !isListening) {
             recognitionRef.current.start();
        }
    };

    const endTest = () => {
        stopTimer();
        setShowConfirmEndModal(false);
        setPhase('finished');
    }

    const resetToSetup = () => {
        window.speechSynthesis.cancel();
        stopTimer();
        setPhase('setup');
        setCurrentQuestionIndex(0);
        setScore(0);
        setQuestions([]);
        setTranscript('');
        setIsTranscriptFinal(false);
        setEvaluationResult(null);
    }

    // Render logic based on phase
    if (phase === 'setup') {
        return (
            <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg animate-fade-in">
                <h1 className="text-3xl font-bold text-center mb-6">Voice Test Setup</h1>
                {/* Topic */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic</label>
                    <select value={topic} onChange={e => setTopic(e.target.value)} className="w-full p-3 bg-gray-100 dark:bg-gray-700 border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-fire-orange-start">
                        <option>Quantitative Aptitude</option>
                        <option>Verbal Ability</option>
                        <option>General Knowledge</option>
                    </select>
                </div>
                {/* Difficulty */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Difficulty</label>
                    <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                        {['Easy', 'Medium', 'Hard'].map(d => (
                            <button key={d} onClick={() => setDifficulty(d)} className={`px-4 py-2 text-sm font-semibold rounded-md transition ${difficulty === d ? 'bg-white dark:bg-gray-900 text-fire-orange-start shadow' : 'text-gray-600 dark:text-gray-300'}`}>{d}</button>
                        ))}
                    </div>
                </div>
                {/* Question Count */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Questions: {questionCount}</label>
                    <input type="range" min="2" max="12" value={questionCount} onChange={e => setQuestionCount(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-fire-orange-start"/>
                </div>
                <button onClick={startTest} className="w-full px-6 py-3 font-semibold text-white bg-gradient-to-r from-fire-orange-start to-fire-red-end rounded-lg hover:opacity-90 transition-opacity">
                    Start Test
                </button>
            </div>
        );
    }

    if (phase === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-t-transparent border-fire-orange-start rounded-full animate-spin"></div>
                <p className="mt-4 text-lg">Generating your voice test...</p>
            </div>
        );
    }

    if (phase === 'finished') {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg animate-fade-in text-center">
                <h2 className="text-3xl font-bold text-fire-orange-start mb-4">Test Finished!</h2>
                <p className="text-xl mb-2">Your final score:</p>
                <p className="text-5xl font-bold mb-6">{score} / {questions.length}</p>
                <button onClick={resetToSetup} className="px-6 py-2 font-semibold text-white bg-gradient-to-r from-fire-orange-start to-fire-red-end rounded-lg hover:opacity-90 transition-opacity">
                    Take Another Test
                </button>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg animate-fade-in relative">
            {/* End Test Button */}
            <button onClick={() => setShowConfirmEndModal(true)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 z-20">
                <XIcon />
            </button>
             {/* Timer */}
            <div className="absolute top-4 left-4 flex items-center text-lg font-semibold text-fire-red-end">
                <ClockIcon />
                <span className="ml-2 w-10">{timeLeft}s</span>
            </div>
            
            {/* Confirmation Modal */}
            {showConfirmEndModal && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-2xl">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center w-11/12 max-w-sm">
                        <h3 className="text-lg font-bold mb-2">End Test?</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Are you sure? Your progress will be lost.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={() => setShowConfirmEndModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-sm font-semibold">Continue Test</button>
                            <button onClick={endTest} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold">End Test</button>
                        </div>
                    </div>
                </div>
            )}

            <h1 className="text-2xl font-bold text-center mb-2 mt-8 sm:mt-0">AI Voice Test</h1>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">{topic} - {difficulty}</p>
            
            <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center min-h-[150px] flex flex-col justify-center">
                <p className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <p className="text-xl font-semibold my-2">{currentQuestion?.question}</p>
                <button onClick={() => speak(currentQuestion.question)} className="inline-flex items-center text-sm text-fire-orange-start font-medium hover:underline mx-auto">
                    <Volume2Icon /> <span className="ml-2">Read Aloud Again</span>
                </button>
            </div>
    
            <div className="flex flex-col items-center my-6">
                <button 
                    onClick={toggleListening}
                    disabled={isListening || phase === 'evaluating' || evaluationResult !== null || timeLeft === 0}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 text-white
                        ${isListening ? 'bg-red-500 animate-pulse' : 'bg-green-500 hover:bg-green-600'}
                        disabled:bg-gray-400 disabled:cursor-not-allowed`}
                >
                    {isListening ? <MicOffIcon size={40} /> : <MicIcon size={40} />}
                </button>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {phase === 'evaluating' ? 'Evaluating...' : (isListening ? 'Listening...' : (evaluationResult ? 'Check your result below' : (timeLeft === 0 ? "Time's up!" : 'Tap to Speak')))}
                </p>
            </div>
            
            {(transcript || evaluationResult) && (
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-center min-h-[120px] flex flex-col justify-center">
                    {transcript && <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">You said:</p>
                        <p className={`text-lg font-medium italic ${isTranscriptFinal ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500'}`}>"{transcript}"</p>
                    </>}

                    {phase === 'evaluating' && !evaluationResult && <div className="mt-2 text-sm">Checking answer...</div>}
                    
                    {evaluationResult && (
                        <div className="mt-2 animate-fade-in">
                            <p className={`font-semibold ${evaluationResult.isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                                {evaluationResult.feedback}
                            </p>
                            <div className="flex justify-center gap-4 mt-4">
                                {!evaluationResult.isCorrect && timeLeft > 0 && (
                                    <button onClick={retryQuestion} className="px-4 py-2 text-sm font-semibold bg-gray-200 dark:bg-gray-600 rounded-lg">Try Again</button>
                                )}
                                <button onClick={goToNextQuestion} className="px-4 py-2 text-sm font-semibold bg-fire-orange-start text-white rounded-lg">
                                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Test'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VoiceTest;
