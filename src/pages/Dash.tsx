import emailjs from '@emailjs/browser';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { Bell, BookOpen, CheckCircle, CheckCircle2, ClipboardList, CreditCard, Eye, FileText, Home, LogOut, Search, Timer } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// --- REFACTORED API HANDLING ---
const API_BASE_URL = 'http://ec2-65-1-135-207.ap-south-1.compute.amazonaws.com:8081/api';

const getAuthToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Token expired or invalid. Redirecting to login.');
      localStorage.removeItem('token');
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);
// --- END OF REFACTORED API HANDLING ---

// --- INTERFACES ---
interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

interface DecodedToken {
  exp: number; // The expiration time (in seconds since epoch)
  [key: string]: any; // Allow other properties if needed
}

// UPDATED: This interface now matches the backend response more closely
interface Exam {
  examId: number;
  registrationId: number; // Crucial for start/complete actions
  examName: string;
  date: string;
  status: "Registered" | "Upcoming" | "Completed" | "In Progress";
  subject: string;
  duration: string;
  score?: number;
}

// This interface is for exams available for registration
interface AvailableExam {
    id: number;
    examName: string;
    subject: string;
    duration: string;
    price: number;
    description: string;
    totalQuestions: number;
}

interface Report {
  id: number;
  name: string;
  subject: string;
  date: string;
  score: number;
  totalQuestions: number;
  status: 'Completed';
}

interface Payment {
    id: number;
    studentName: string; // From backend response
    amount: number;
    date: string;
    status: 'Paid' | 'Pending' | 'Failed';
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
}

// --- MOCK DATA (Only for exam questions, as this is not yet fetched from backend) ---
const questions: Question[] = [ { id: 1, text: "What is the time complexity of the QuickSort algorithm in the average case?", options: ["O(n²)", "O(n log n)", "O(log n)", "O(n)"], correctAnswer: 1 }, { id: 2, text: "Which data structure uses FIFO (First-In-First-Out) principle?", options: ["Stack", "Queue", "Tree", "Graph"], correctAnswer: 1 }, { id: 3, text: "What is the main purpose of an index in a database?", options: ["To store data", "To improve query performance", "To backup data", "To encrypt data"], correctAnswer: 1 }, { id: 4, text: "Which protocol is used to send email?", options: ["FTP", "SMTP", "HTTP", "SSH"], correctAnswer: 1 }, { id: 5, text: "What does CSS stand for?", options: ["Computer Style Sheets", "Creative Style Sheets", "Cascading Style Sheets", "Colorful Style Sheets"], correctAnswer: 2 }, { id: 6, text: "Which of these is not a JavaScript framework?", options: ["React", "Angular", "Laravel", "Vue"], correctAnswer: 2 }, { id:7, text: "What is the capital of France?", options: ["London", "Madrid", "Paris", "Berlin"], correctAnswer: 2 }, { id: 8, text: "What is the capital of Germany?", options: ["London", "Madrid", "Paris", "Berlin"], correctAnswer: 3 }, { id: 9, text: "What is the capital of Spain?", options: ["London", "Madrid", "Paris", "Berlin"], correctAnswer: 1 }, { id: 10, text: "What is the capital of England?", options: ["London", "Madrid", "Paris", "Berlin"], correctAnswer: 0 } ];

// --- COMPONENTS ---

function ExamComponent({ 
  exam, 
  userProfile, // <-- 1. Accept the userProfile prop
  onBack,
  onComplete
}: { 
  exam: Exam;
  userProfile: UserProfile | null; // <-- Add to the type definition
  onBack: () => void;
  onComplete: (exam: Exam, score: number, totalQuestions: number) => void;
}) {
  const [currentView, setCurrentView] = useState<'terms' | 'welcome' | 'exam' | 'confirm'|'thankyou'>('terms');
  const [agreed, setAgreed] = useState(false);
  const [password, setPassword] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(exam.duration);
  const [email, setEmail] = useState(userProfile?.email || '');

  const handleFinalSubmit = useCallback(() => {
    let score = 0;
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score++;
      }
    });
    
    onComplete(exam, score, questions.length);
    
    setCurrentView('thankyou');
  }, [exam, onComplete, questions, selectedAnswers]);

  useEffect(() => {
    if (currentView === 'exam') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          const [hours, minutes, seconds] = prev.split(':').map(Number);
          let totalSeconds = hours * 3600 + minutes * 60 + seconds;
          totalSeconds--;
          if (totalSeconds <= 0) {
            clearInterval(timer);
            handleFinalSubmit(); // Auto-submit when time runs out
            return '00:00:00';
          }
          const newHours = Math.floor(totalSeconds / 3600);
          const newMinutes = Math.floor((totalSeconds % 3600) / 60);
          const newSeconds = totalSeconds % 60;
          return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [currentView, handleFinalSubmit]);

  const handleAgreeTerms = () => {
    setCurrentView('welcome');
  };

  const handleLogin = () => {
    setCurrentView('exam');
  };

  const handleAnswerSelect = (questionId: number, optionIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmit = () => {
    setCurrentView('confirm');
  };


  const renderQuestionNumbers = () => {
    return (
      <div className="flex flex-col gap-2">
        {questions.map((_, index) => (
          <button
            key={index}
            className={`w-10 h-10 rounded-lg ${
              selectedAnswers[index] !== undefined ? 'bg-indigo-600 text-white' : 'bg-gray-200'
            }`}
            onClick={() => setCurrentQuestion(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>
    );
  };

  const sendPasswordCode = async () => {
    if (!email) {
      alert("Please enter your email.");
      return;
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const templateParams = {
      email_from: email,
      passcode: otp,
      time: new Date(Date.now() + 15 * 60000).toLocaleTimeString(),
    };
    try {
      await emailjs.send(
        "service_5hmqqzg",      
        "template_0qhaaqf",   
        templateParams,
        "NCQ-5D-Axdtas-n3s"        
      );
      alert("OTP sent to your email!");
    } catch (error) {
      console.error("Failed to send OTP:", error);
      alert("Failed to send OTP. Please try again.");
    }
  };

  if (currentView === 'terms') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">Terms and Conditions</h2>
          <p className="text-gray-600 mb-8">
            By accessing or using this System, you agree to comply with and
            be bound by these Terms and Conditions. If you do not agree
            with any part of these terms, you are not permitted to use this System.
          </p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <input
              type="checkbox"
              id="agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-4 w-4 text-indigo-600"
            />
            <label htmlFor="agree">I agree to the terms and conditions</label>
          </div>
          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="w-full py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={handleAgreeTerms}
              disabled={!agreed}
              className={`w-full py-2 rounded-lg ${
                agreed
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Take exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'thankyou') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <h3 className="text-xl mb-6">You have successfully completed the exam</h3>
          <p className="text-gray-600 mb-6">
            Your answers have been submitted. You can now close this window or 
            return to your dashboard.
          </p>
          <button
            onClick={onBack}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'welcome') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome</h2>
          <h3 className="text-xl mb-6">Are you ready to take your exam?</h3>
          <p className="text-gray-600 mb-6">
            Provide the Email you used during registration to receive a password code.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 mb-6 border rounded-lg bg-gray-100" // Style it as disabled
            readOnly // <-- Make the field read-only
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter the OTP code"
            className="w-full p-2 mb-6 border rounded-lg"
          />
          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="w-full py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={sendPasswordCode}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
              Send Code
            </button>
            <button
              onClick={handleLogin}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'confirm') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">Are you sure you want to submit?</h2>
          <p className="text-gray-600 mb-6">
            Once you submit, you won't be able to change your answers. 
            Make sure you've answered all questions before submitting.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentView('exam')}
              className="w-full py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              Back to Exam
            </button>
            <button
              onClick={handleFinalSubmit}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
            >
              Confirm Submit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/vite.svg" alt="Logo" className="h-8 w-8" />
            <h1 className="text-xl font-bold">{exam.subject}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Timer size={16} className="text-gray-400" />
              <span className={timeLeft.startsWith('00:0') ? 'text-red-500 font-bold' : ''}>
                {timeLeft}
              </span>
            </div>
            <span className="text-gray-600">Welcome, {userProfile?.name || 'User'}</span>
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
               {userProfile?.name ? userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto mt-8 p-4 flex gap-8">
        <div className="w-24">
          {renderQuestionNumbers()}
          <button
            onClick={handleSubmit}
            className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
          >
            Submit
          </button>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            Q{currentQuestion + 1}: {questions[currentQuestion].text}
          </h2>
          <div className="space-y-4">
            {questions[currentQuestion].options.map((option, index) => (
              <label
                key={index}
                className="block p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name={`answer-${currentQuestion}`}
                  checked={selectedAnswers[currentQuestion] === index}
                  onChange={() => handleAnswerSelect(currentQuestion, index)}
                  className="mr-3"
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Sidebar({ activePage, setActivePage, onSignOut }: { activePage: string; setActivePage: (page: string) => void; onSignOut: () => void; }) {
  return (
    <div className="w-64 bg-indigo-900 h-screen fixed left-0 top-0 text-white p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">EduQuest</h1>
      </div>
      
      <nav className="space-y-4 flex-grow">
        {/* ... navigation links ... */}
        <a href="#" className={`flex items-center space-x-3 p-3 rounded-lg ${activePage === 'dashboard' ? 'bg-indigo-800' : 'hover:bg-indigo-800'}`} onClick={() => setActivePage('dashboard')}><Home size={20} /><span>Dashboard</span></a>
        <a href="#" className={`flex items-center space-x-3 p-3 rounded-lg ${activePage === 'exams' ? 'bg-indigo-800' : 'hover:bg-indigo-800'}`} onClick={() => setActivePage('exams')}><BookOpen size={20} /><span>My Exams</span></a>
        <a href="#" className={`flex items-center space-x-3 p-3 rounded-lg ${activePage === 'register' ? 'bg-indigo-800' : 'hover:bg-indigo-800'}`} onClick={() => setActivePage('register')}><ClipboardList size={20} /><span>Register for Exam</span></a>
        <a href="#" className={`flex items-center space-x-3 p-3 rounded-lg ${activePage === 'reports' ? 'bg-indigo-800' : 'hover:bg-indigo-800'}`} onClick={() => setActivePage('reports')}><FileText size={20} /><span>My Results</span></a>
        <a href="#" className={`flex items-center space-x-3 p-3 rounded-lg ${activePage === 'payments' ? 'bg-indigo-800' : 'hover:bg-indigo-800'}`} onClick={() => setActivePage('payments')}><CreditCard size={20} /><span>Payment History</span></a>
      </nav>
      
      <div>
        {/* UPDATED: onClick now calls the prop */}
        <a href="#" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-indigo-800" onClick={onSignOut}>
          <LogOut size={20} />
          <span>Sign out</span>
        </a>
      </div>
    </div>
  );
}
function Dashboard({ exams, reports, onStartExam, setActivePage }: { 
    exams: Exam[]; 
    reports: Report[];
    onStartExam: (exam: Exam) => void;
    setActivePage: (page: string) => void;
  }) {
    // Find the next upcoming exam by sorting
    const upcomingExams = exams
      .filter(e => e.status === 'Upcoming' || e.status === 'Registered')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const nextExam = upcomingExams[0];
  
    // Get the last 3 reports
    const recentReports = reports.slice(-3).reverse();
  
    return (
      <div className="space-y-8">
        {/* Top section with primary actions and info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  
          {/* --- UP NEXT CARD (MAIN FOCUS) --- */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Up Next</h3>
            {nextExam ? (
              <div>
                <h4 className="text-2xl font-bold text-indigo-700">{nextExam.examName}</h4>
                <p className="text-gray-500 mb-4">{nextExam.subject}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={18} className="text-indigo-400" />
                    <span>Questions TBD</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer size={18} className="text-indigo-400" />
                    <span>{nextExam.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Date:</span>
                    <span>{new Date(nextExam.date).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => onStartExam(nextExam)}
                  className="w-full md:w-auto bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition-transform transform hover:scale-105"
                >
                  Start Exam Now
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                 <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                 <h4 className="text-xl font-semibold">You're all caught up!</h4>
                 <p className="text-gray-500 mt-2">There are no upcoming exams on your schedule.</p>
                 <button
                    onClick={() => setActivePage('register')}
                    className="mt-4 bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600"
                 >
                   Register for a New Exam
                 </button>
              </div>
            )}
          </div>
  
          {/* --- RECENT PERFORMANCE CARD --- */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Performance</h3>
            {recentReports.length > 0 ? (
              <div className="space-y-4">
                {recentReports.map(report => (
                  <div key={report.id} className="bg-gray-50 p-3 rounded-lg">
                    <p className="font-semibold text-gray-700">{report.subject}</p>
                    <p className="text-sm text-gray-500">
                      Score: <span className="font-bold text-indigo-600">{report.score} / {report.totalQuestions}</span>
                    </p>
                  </div>
                ))}
                <button 
                  onClick={() => setActivePage('reports')}
                  className="text-sm font-semibold text-indigo-600 hover:underline mt-2">
                    View All Reports →
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText size={40} className="mx-auto text-gray-300" />
                <p className="text-gray-500 mt-4">Complete an exam to see your performance here.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* --- UPCOMING SCHEDULE TABLE --- */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-800">Your Upcoming Schedule</h3>
          </div>
          {upcomingExams.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exam Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {upcomingExams.map(exam => (
                  <tr key={exam.registrationId}>
                    <td className="px-6 py-4 font-medium">{exam.examName}</td>
                    <td className="px-6 py-4">{exam.subject}</td>
                    <td className="px-6 py-4">{new Date(exam.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{exam.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8">No exams are currently scheduled.</p>
          )}
        </div>
      </div>
    );
  }

function ExamsPage({ exams, onStartExam }: { exams: Exam[]; onStartExam: (exam: Exam) => void; }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Search exams..."
            className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {exams.map((exam) => (
              <tr key={exam.registrationId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium">{exam.examName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{exam.duration}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      exam.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {exam.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(exam.status === 'Upcoming' || exam.status === 'Registered') ? (
                    <button
                      onClick={() => onStartExam(exam)}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                    >
                      <CheckCircle2 size={16} />
                      Start Exam
                    </button>
                  ) : (
                    <span className="text-gray-500">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RegisterPage({
  availableExams,
  onSuccessfulRegistration
}: {
  availableExams: AvailableExam[];
  onSuccessfulRegistration: () => Promise<void>;
}) {
  const [selectedExam, setSelectedExam] = useState<AvailableExam | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvv: ''
  });

  const handleRegister = (exam: AvailableExam) => {
    setSelectedExam(exam);
    setShowPayment(true);
  };
  
// In Dash.tsx, inside the RegisterPage component

// In Dash.tsx, inside the RegisterPage component

  const handlePaymentSubmit = async () => {
    if (!selectedExam) return;

    try {
      // Add paymentMethod to the request body
      await api.post('/payments/create', {
        examId: selectedExam.id,
        amount: selectedExam.price,
        paymentMethod: paymentMethod // <-- ADD THIS LINE
      });

      // ... rest of the function is the same
      await api.post(`/exams/${selectedExam.id}/register`);
      alert('Registration and Payment successful!');
      await onSuccessfulRegistration();
      setShowPayment(false);
      setSelectedExam(null);

    } catch (error) {
      console.error("Failed to register or create payment:", error);
      alert("There was an error during registration. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{availableExams.length > 0 ? 'Available Exams' : 'No New Exams Available'}</h2>
      </div>

      {!showPayment ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableExams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2 text-indigo-700">{exam.examName}</h3>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Subject: {exam.subject}</span>
                  <span>Duration: {exam.duration}</span>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Includes {exam.totalQuestions} questions</p>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <span className="text-lg font-bold text-green-600">${exam.price}</span>
                  <button
                    onClick={() => handleRegister(exam)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Register Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-6">Complete Registration</h3>
          
          <div className="mb-6">
            <h4 className="font-medium mb-2">Exam Details</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold text-indigo-700">{selectedExam?.examName}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <p>Subject: {selectedExam?.subject}</p>
                <p>Duration: {selectedExam?.duration}</p>
                <p>Questions: {selectedExam?.totalQuestions}</p>
                <p className="font-bold">Price: ${selectedExam?.price}</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium mb-4">Payment Method</h4>
            <div className="flex gap-4 mb-4">
              <button
                className={`px-4 py-2 rounded-lg border-2 ${paymentMethod === 'credit' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-300'}`}
                onClick={() => setPaymentMethod('credit')}
              >
                Credit Card
              </button>
                <button
                className={`px-4 py-2 rounded-lg border-2 ${paymentMethod === 'paypal' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-300'}`}
                onClick={() => setPaymentMethod('paypal')}
              >
                PayPal
              </button>
            </div>

            {paymentMethod === 'credit' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      value={cardDetails.cvv}
                      onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowPayment(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handlePaymentSubmit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              disabled={paymentMethod === 'credit' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv)}
            >
              Complete Registration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportsPage({ reports }: { reports: Report[]; }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <input
            type="text"
            placeholder="Search reports..."
            className="pl-10 pr-4 py-2 border rounded-lg w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
        </div>
      </div>
      {reports.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl shadow-lg">
          <FileText size={48} className="mx-auto text-gray-300" />
          <h3 className="mt-2 text-xl font-semibold">No Reports Yet</h3>
          <p className="text-gray-500">Complete an exam to see your report here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{report.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{report.subject}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{report.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-indigo-600">
                    {report.score} / {report.totalQuestions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => alert(`Viewing report for ${report.name}`)}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PaymentsPage({ payments }: { payments: Payment[] }) {
      const paidCount = payments.filter(p => p.status === 'Paid').length;
      const pendingCount = payments.filter(p => p.status !== 'Paid').length; // More robust

      return (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                  <div className="relative">
                      <input
                          type="text"
                          placeholder="Search payments..."
                          className="pl-10 pr-4 py-2 border rounded-lg w-64"
                      />
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                      <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                              <CheckCircle className="text-blue-600" size={24} />
                          </div>
                          <div>
                              <p className="text-sm text-gray-500">Paid Invoices</p>
                              <p className="text-2xl font-bold">{paidCount}</p>
                          </div>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                      <div className="flex items-center space-x-4">
                          <div className="p-3 bg-yellow-100 rounded-lg">
                              <CreditCard className="text-yellow-600" size={24} />
                          </div>
                          <div>
                              <p className="text-sm text-gray-500">Pending</p>
                              <p className="text-2xl font-bold">{pendingCount}</p>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <table className="w-full">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                          {payments.map((payment) => (
                              <tr key={payment.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">{payment.studentName}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">${payment.amount}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">{payment.date}</td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 py-1 rounded-full text-xs ${
                                          payment.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                          {payment.status}
                                      </span>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  }

// ===================================================================================
// ============================= MAIN DASH COMPONENT =================================
// ===================================================================================

function Dash() {
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Centralized State for data from the backend
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [availableExams, setAvailableExams] = useState<AvailableExam[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]); // This is still frontend-only for now
  const navigate = useNavigate();

  // REFACTORED: Central data fetching logic
  const fetchAllData = useCallback(async () => {
    try {
      // Fetch all essential data in parallel for speed
      const [
        profileRes,
        registeredRes,
        availableRes,
        paymentsRes
      ] = await Promise.all([
        api.get('/users/profile'),
        api.get('/exams/registered'),
        api.get('/exams/available'),
        api.get('/payments') // Assuming this is the correct endpoint for user's payments
      ]);
      
      setUserProfile(profileRes.data);
      setExams(registeredRes.data);
      setAvailableExams(availableRes.data);
      setPayments(paymentsRes.data);

    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      // Handle error gracefully, maybe show a toast notification
    }
  }, []);

  // Fetch data on initial component load
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleSignOut = useCallback(() => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    navigate('/login');
  }, [navigate]);

    useEffect(() => {
      const interval = setInterval(() => {
        const token = getAuthToken();
        if (!token) {
          handleSignOut();
          return;
        }
        try {
          const decodedToken = jwtDecode<DecodedToken>(token); // Use the interface here
          const currentTime = Date.now() / 1000;
          if (decodedToken.exp < currentTime) {
            console.log("Token expired, logging out.");
            handleSignOut();
          }
        } catch (error) {
          console.error("Invalid token, logging out.", error);
          handleSignOut();
        }
      }, 60000); 
    
      return () => clearInterval(interval); 
    }, [handleSignOut]);
  
  // This function will be passed to the RegisterPage to trigger a refresh
  const handleSuccessfulRegistration = async () => {
    await fetchAllData(); // Refetch all data to get the latest lists
    setActivePage('exams'); // Switch to the "My Exams" page to show the new exam
  };

    // In Dash.tsx, REPLACE your old handleExamComplete with this:
  const handleExamComplete = async (completedExam: Exam, score: number, totalQuestions: number): Promise<boolean> => {
    try {
      // Tell the backend the exam is complete
      await api.post(`/exams/complete/${completedExam.registrationId}`, { score });

      // Refresh all data from the database
      await fetchAllData(); 
      setSelectedExam(null);
      return true; // Return true on success

    } catch (error) {
      console.error("Failed to submit exam completion:", error);
      alert("There was an error submitting your results. Please contact support.");
      return false; // Return false on failure
    }
  };


  const handleStartExam = async (exam: Exam) => {
    try {
        // Tell the backend we are starting the exam
        await api.post(`/exams/start/${exam.registrationId}`);
        // If successful, show the exam component
        setSelectedExam(exam);
    } catch(error) {
        console.error("Failed to start exam:", error);
        alert("Could not start the exam. Please try again.");
    }
  };

  const handleBackFromExam = () => {
    setSelectedExam(null);
  };
  
  const toggleDropdown = () => {
    setShowDropdown((prev) => !prev);
  };

  const toggleTheme = () => {
    setIsDarkMode((prevMode) => !prevMode);
  };

  if (selectedExam) {
    return <ExamComponent 
              exam={selectedExam} 
              onBack={handleBackFromExam} 
              onComplete={handleExamComplete} 
              userProfile={userProfile} // <-- PASS THE PROP HERE
           />;
  }
  // In Dash.tsx, right before the 'return' statement

  // In Dash.tsx, right before the 'return' statement

    const completedExamsAsReports: Report[] = exams
    // Add a check to ensure the score exists and is a number
    .filter((exam): exam is Exam & { score: number } => 
      exam.status === 'Completed' && typeof exam.score === 'number'
    )
    .map(exam => ({
      id: exam.registrationId,
      name: `${exam.examName} Result`,
      subject: exam.subject,
      date: exam.date,
      score: exam.score, // This will now be correctly typed as a number
      totalQuestions: 10, // This should come from your backend in the future
      status: 'Completed'
    }));

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
      <Sidebar activePage={activePage} setActivePage={setActivePage} onSignOut={handleSignOut}/>
      
      <div className="ml-64 p-8 relative">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {activePage.charAt(0).toUpperCase() + activePage.slice(1)}
            </h1>
            <p className="text-gray-500">Welcome back, {userProfile?.name || 'User'}</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
              <Bell size={20} />
            </button>
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex items-center justify-center"
            >
              {isDarkMode ? '🌞' : '🌙'}
            </button>
            <div className="relative">
              <div
                className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white cursor-pointer"
                onClick={toggleDropdown}
              >
                {userProfile?.name ? userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
              </div>

              {showDropdown && (
                <div className="absolute mt-2 right-0 bg-white shadow-lg rounded-lg w-40 z-10 text-gray-800">
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100">Settings</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100">Edit</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {activePage === 'dashboard' && <Dashboard 
            exams={exams} 
            reports={completedExamsAsReports} 
            onStartExam={handleStartExam}
            setActivePage={setActivePage} 
        />}
        {activePage === 'exams' && <ExamsPage exams={exams} onStartExam={handleStartExam} />}
        {activePage === 'register' && <RegisterPage 
            availableExams={availableExams}
            onSuccessfulRegistration={handleSuccessfulRegistration}
        />}
        {activePage === 'reports' && <ReportsPage reports={completedExamsAsReports} />}
        {activePage === 'payments' && <PaymentsPage payments={payments} />}
      </div>
    </div>
  );
}

export default Dash;
