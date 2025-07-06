import React, { useState, useEffect } from 'react';
import { Github, Stars, GitFork, Copy, BrainCircuit, LoaderCircle, ServerCrash, UserCheck, ShieldOff } from 'lucide-react';

// --- Main App Component ---
export default function App() {
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState(null);
  const [repos, setRepos] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleAnalyze = async () => {
    if (!username) {
      setError('Please enter a GitHub username.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setUserData(null);
    setRepos([]);
    setSuggestions([]);

    try {
      // --- Step 1: Fetch Live GitHub Data ---
      const userResponse = await fetch(`https://api.github.com/users/${username}`);
      if (userResponse.status === 404) {
        throw new Error('GitHub user not found.');
      }
      if (!userResponse.ok) {
        throw new Error(`Failed to fetch GitHub user data. Status: ${userResponse.status}`);
      }
      const fetchedUserData = await userResponse.json();
      
      const reposResponse = await fetch(fetchedUserData.repos_url + '?sort=updated&per_page=10');
       if (!reposResponse.ok) {
        throw new Error('Failed to fetch GitHub repository data.');
      }
      const fetchedRepoData = await reposResponse.json();

      setUserData(fetchedUserData);
      setRepos(fetchedRepoData);
      
      // --- Step 2: Call Gemini API for Suggestions ---
      const prompt = `
        Analyze the following live GitHub user data and generate 3 actionable, creative suggestions to enhance their GitHub profile README.
        For each suggestion, provide a title and a markdown snippet that is ready to copy and paste.
        Incorporate relevant markdown badges from sources like shields.io or skill-icons based on the user's repositories.
        Make the suggestions specific and relevant to the user's projects and languages.
        
        User Data:
        - Name: ${fetchedUserData.name || fetchedUserData.login}
        - Bio: ${fetchedUserData.bio}
        - Repositories: ${JSON.stringify(fetchedRepoData.map(r => ({name: r.name, description: r.description, stars: r.stargazers_count, language: r.language})))}

        Return the response as a valid JSON array of objects. Each object should have the following structure:
        { "title": "Suggestion Title", "markdown": "Markdown snippet here" }
        Do not include any other text or explanations outside the JSON structure.
      `;
      
      const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
      const payload = { 
          contents: chatHistory,
          generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: "ARRAY",
                  items: {
                      type: "OBJECT",
                      properties: {
                          "title": { "type": "STRING" },
                          "markdown": { "type": "STRING" }
                      },
                      required: ["title", "markdown"]
                  }
              }
          }
      };
      
      const apiKey = ""; // Leave empty, handled by environment
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.status === 403) {
          throw new Error("API_KEY_RESTRICTED");
      }
      if (!response.ok) {
          throw new Error(`AI API call failed with status: ${response.status}`);
      }
      
      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts[0].text) {
        const jsonText = result.candidates[0].content.parts[0].text;
        const parsedSuggestions = JSON.parse(jsonText);
        setSuggestions(parsedSuggestions);
      } else {
        if (result.promptFeedback && result.promptFeedback.blockReason) {
             throw new Error(`AI content blocked: ${result.promptFeedback.blockReason}`);
        }
        throw new Error("AI failed to generate valid suggestions.");
      }

    } catch (err) {
      console.error(err);
      if (err.message === "API_KEY_RESTRICTED") {
          setError("The AI analysis is disabled on this public site due to API key restrictions. This feature works in local development.");
      } else {
          setError(err.message || 'An unexpected error occurred. Please try again later.');
      }
      // Keep user data even if AI fails
      if (!userData) {
        setUserData(null);
        setRepos([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = (text, index) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    document.body.removeChild(textArea);
  };

  const renderError = () => {
      if (!error) return null;

      if (error.includes("API key restrictions")) {
          return (
            <div className="text-center p-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                <ShieldOff className="text-yellow-400 mx-auto mb-4" size={48} />
                <p className="text-xl text-yellow-300">AI Analysis Disabled</p>
                <p className="text-gray-400 max-w-md mx-auto">{error}</p>
            </div>
          );
      }

      return (
        <div className="text-center p-8 bg-red-900/20 border border-red-500/30 rounded-xl">
            <ServerCrash className="text-red-400 mx-auto mb-4" size={48} />
            <p className="text-xl text-red-300">An Error Occurred</p>
            <p className="text-gray-400">{error}</p>
        </div>
      );
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
            Smart GitHub Profile Enhancer
          </h1>
          <p className="text-gray-400 text-lg">
            Leverage AI to generate stunning additions for your GitHub README.
          </p>
        </header>

        <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter a GitHub username (e.g., ErdeszGyorgy)"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="animate-spin mr-2" size={20} />
                  Analyzing...
                </>
              ) : (
                'Enhance Profile'
              )}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="text-center p-8">
            <LoaderCircle className="animate-spin text-purple-400 mx-auto mb-4" size={48} />
            <p className="text-xl">Fetching live data from GitHub...</p>
            <p className="text-gray-400">Then, the AI will work its magic. This might take a moment.</p>
          </div>
        )}

        {!isLoading && !userData && !error && (
            <div className="text-center p-8 bg-gray-800/50 border border-gray-700 rounded-xl">
                <UserCheck className="text-cyan-400 mx-auto mb-4" size={48} />
                <p className="text-xl">Ready to Analyze</p>
                <p className="text-gray-400">Enter a GitHub username above to get started.</p>
            </div>
        )}

        {error && !isLoading && renderError()}

        {!isLoading && userData && (
          <div className="space-y-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-xl shadow-lg flex flex-col sm:flex-row items-center gap-6">
              <img src={userData.avatar_url} onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/96x96/1F2937/FFFFFF?text=??'; }} alt={userData.login} className="w-24 h-24 rounded-full border-4 border-gray-700" />
              <div className="text-center sm:text-left">
                <h2 className="text-3xl font-bold">{userData.name || userData.login}</h2>
                <p className="text-gray-400">@{userData.login}</p>
                <p className="text-gray-300 mt-2 max-w-lg">{userData.bio || 'No bio provided.'}</p>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div>
                <h3 className="flex items-center text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">
                  <BrainCircuit className="mr-3" />
                  AI-Powered README Suggestions
                </h3>
                <div className="space-y-4">
                  {suggestions.map((s, index) => (
                    <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                      <div className="p-4 flex justify-between items-center bg-gray-700/50">
                        <h4 className="font-bold text-lg">{s.title}</h4>
                        <button 
                          onClick={() => handleCopyToClipboard(s.markdown, index)}
                          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-sm font-semibold py-1 px-3 rounded-md transition-colors"
                        >
                          <Copy size={14} />
                          {copiedIndex === index ? 'Copied!' : 'Copy Markdown'}
                        </button>
                      </div>
                      <div className="p-4 bg-gray-900/50">
                        <pre className="whitespace-pre-wrap break-words text-sm text-gray-300"><code>{s.markdown}</code></pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {repos.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold mb-4">Latest Public Repositories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {repos.map(repo => (
                    <div key={repo.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-purple-500 transition-colors">
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="font-bold text-purple-400 truncate block hover:underline">{repo.name}</a>
                      <p className="text-sm text-gray-400 my-2 h-10 overflow-hidden">{repo.description || 'No description.'}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-300 mt-2">
                        <div className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded-full bg-gray-500`}></div>{repo.language || 'N/A'}</div>
                        <div className="flex items-center gap-1"><Stars size={16} className="text-yellow-500" /> {repo.stargazers_count}</div>
                        <div className="flex items-center gap-1"><GitFork size={16} className="text-gray-400" /> {repo.forks_count}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
