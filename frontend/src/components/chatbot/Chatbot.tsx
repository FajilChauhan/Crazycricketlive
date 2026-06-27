import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

interface Message {
  id: string;
  text: string;
  sender: 'bot' | 'user';
}

const FAQS = [
  {
    question: "How do I create an account?",
    answer: "Click the 'Sign Up' button in the top right corner. Enter your username, email, and password to get started. Once signed up, you can create tournaments and score matches."
  },
  {
    question: "How do I create a tournament?",
    answer: "Click the 'Create' button in the navbar. Enter your tournament name and organization name. After creating it, you can add teams and schedule matches from the tournament detail page."
  },
  {
    question: "How do I add teams to a tournament?",
    answer: "Open your tournament, go to the 'Teams' tab, and click 'Create Team'. Add the team name and optionally a logo URL. Only the tournament owner can create teams."
  },
  {
    question: "How do I add players to a team?",
    answer: "Open the team page and click 'Add Player'. Select a registered user, assign their role (Batsman, Bowler, etc.), jersey number, and optionally mark them as captain."
  },
  {
    question: "How do I create a match?",
    answer: "Go to your tournament's 'Matches' tab and click 'Create Match'. Select Team 1 and Team 2, enter the ground name, choose overs and match type, and set a scheduled date and time."
  },
  {
    question: "How do I start live scoring?",
    answer: "First set the match status to 'Live' from the match detail page. Then click 'Start Innings', select the batting and bowling teams. Once innings starts, click 'Live Scoring' to begin ball-by-ball scoring."
  },
  {
    question: "How do I give scoring permission to someone?",
    answer: "On the match detail page, go to the 'Permissions' tab and click 'Grant Access'. Select the user and choose 'Score Update' for scorers or 'Match Admin' for full control."
  },
  {
    question: "How does 1v1 mode work?",
    answer: "In 1v1 (Gully Cricket) mode, each team represents a single player batting individually. Select this mode when creating a match. Scoring works the same — just select the same player as striker each time."
  },
  {
    question: "How is the winner decided automatically?",
    answer: "The system auto-detects when a team chases the target, completes all overs, or goes all out. It then declares the winner and shows the match result. If scores are equal, it shows a tie option."
  },
  {
    question: "What is Man of the Match?",
    answer: "After a match ends, you'll see a 'Man of the Match' popup where the tournament owner can select the best-performing player. This is optional and shown on the match detail page."
  },
  {
    question: "Can I search for players or teams?",
    answer: "Yes! Click the search icon in the navbar or visit the Search page. You can search across tournaments, teams, players, and matches all at once."
  },
  {
    question: "Why can't I delete a team?",
    answer: "Teams that have been used in any match cannot be deleted to preserve match history. You can only delete teams that haven't played any matches yet."
  },
];

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: "👋 Welcome to CrazyCricketLive Support Production By SAFNAM! I'm here to help you with anything — creating tournaments, scoring matches, managing teams, and more. Tap a question below to get started.",
      sender: 'bot'
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleFAQClick = (faq: { question: string; answer: string }) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      text: faq.question,
      sender: 'user'
    };
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: faq.answer,
      sender: 'bot'
    };
    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  return (
    <div className="chatbot-container">
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>

        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">🏏</div>
            <div>
              <p className="chatbot-header-title">GullyCricket Support</p>
              <p className="chatbot-header-sub">Ask me anything</p>
            </div>
          </div>
          <button className="chatbot-close" onClick={toggleChat}>✕</button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* FAQ Options */}
        <div className="chatbot-options-label">Common Questions</div>
        <div className="chatbot-options">
          {FAQS.map((faq, index) => (
            <button
              key={index}
              className="faq-option"
              onClick={() => handleFAQClick(faq)}
            >
              {faq.question}
            </button>
          ))}
        </div>

      </div>

      {/* Toggle Button */}
      <button className="chatbot-toggle-btn" onClick={toggleChat} title="Support">
        {isOpen ? (
          <svg stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24"
            strokeLinecap="round" strokeLinejoin="round" height="22" width="22"
            xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24"
            strokeLinecap="round" strokeLinejoin="round" height="24" width="24"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default Chatbot;